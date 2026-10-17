// Windows MongoDB archives include hundreds of MB of debug symbols. Download
// only mongod.exe from the official ZIP using HTTP ranges; verify ZIP CRC32.
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

export async function windowsTestMongoBinary() {
  if (process.platform !== "win32") return undefined;
  const version = "8.2.6";
  const directory = join(
    process.cwd(),
    "node_modules",
    ".cache",
    "quietlogic-mongo",
  );
  const output = join(directory, "mongod.exe");
  const checksumFile = join(directory, "checksum.json");
  try {
    const saved = JSON.parse(await readFile(checksumFile, "utf8"));
    if (saved.version === version && (await stat(output)).size === saved.size)
      return output;
  } catch {
    /* first run */
  }
  const url = `https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-${version}.zip`;
  const head = await fetch(url, {
    method: "HEAD",
    signal: AbortSignal.timeout(30000),
  });
  if (!head.ok) throw new Error("MongoDB test binary is unavailable.");
  const length = Number(head.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length < 65557)
    throw new Error("Invalid MongoDB archive length.");
  async function range(start, end) {
    const response = await fetch(url, {
      headers: { Range: `bytes=${start}-${end}` },
      signal: AbortSignal.timeout(60000),
    });
    if (response.status !== 206) {
      await response.body?.cancel();
      throw new Error(
        "MongoDB host did not honor the bounded download request.",
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== end - start + 1)
      throw new Error("Incomplete MongoDB archive range.");
    return bytes;
  }
  const tail = await range(length - 65557, length - 1);
  let eocd = tail.length - 22;
  while (eocd >= 0 && tail.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Invalid MongoDB ZIP directory.");
  const directorySize = tail.readUInt32LE(eocd + 12),
    directoryOffset = tail.readUInt32LE(eocd + 16);
  const entries = await range(
    directoryOffset,
    directoryOffset + directorySize - 1,
  );
  let entry;
  for (let offset = 0; offset + 46 <= entries.length;) {
    if (entries.readUInt32LE(offset) !== 0x02014b50)
      throw new Error("Invalid MongoDB ZIP entry.");
    const nameLength = entries.readUInt16LE(offset + 28),
      extraLength = entries.readUInt16LE(offset + 30),
      commentLength = entries.readUInt16LE(offset + 32);
    const name = entries
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");
    if (name.endsWith("/bin/mongod.exe")) {
      entry = {
        method: entries.readUInt16LE(offset + 10),
        crc: entries.readUInt32LE(offset + 16),
        compressed: entries.readUInt32LE(offset + 20),
        size: entries.readUInt32LE(offset + 24),
        offset: entries.readUInt32LE(offset + 42),
      };
      break;
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (
    !entry ||
    entry.method !== 8 ||
    entry.compressed > 200 * 1024 * 1024 ||
    entry.size > 600 * 1024 * 1024
  )
    throw new Error("Unexpected MongoDB executable entry.");
  console.log(
    `Downloading MongoDB ${version} test executable (${Math.ceil(entry.compressed / 1024 / 1024)} MB compressed)…`,
  );
  const header = await range(entry.offset, entry.offset + 29);
  if (header.readUInt32LE(0) !== 0x04034b50)
    throw new Error("Invalid MongoDB file header.");
  const dataStart =
    entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
  const chunks = [];
  const chunkSize = 2 * 1024 * 1024;
  for (let offset = 0; offset < entry.compressed; offset += chunkSize) {
    chunks.push(
      await range(
        dataStart + offset,
        dataStart + Math.min(entry.compressed, offset + chunkSize) - 1,
      ),
    );
    if (chunks.length % 5 === 0)
      console.log(
        `MongoDB test download: ${Math.min(entry.compressed, offset + chunkSize) >> 20} MB`,
      );
  }
  const binary = inflateRawSync(Buffer.concat(chunks), {
    maxOutputLength: entry.size,
  });
  let crc = 0xffffffff;
  const table = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    return value >>> 0;
  });
  for (const byte of binary) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
  if (binary.length !== entry.size || (crc ^ 0xffffffff) >>> 0 !== entry.crc)
    throw new Error("MongoDB executable integrity check failed.");
  await mkdir(directory, { recursive: true });
  await writeFile(output, binary);
  await writeFile(
    checksumFile,
    JSON.stringify({ version, size: entry.size, crc: entry.crc }),
  );
  return output;
}
