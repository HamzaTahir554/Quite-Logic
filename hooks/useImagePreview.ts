"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function useImagePreview() {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [selection, setSelection] = useState<{
    file: File | null;
    preview: string;
  }>({ file: null, preview: "" });
  useEffect(
    () => () => {
      if (selection.preview) URL.revokeObjectURL(selection.preview);
    },
    [selection.preview],
  );
  return {
    ready,
    ...selection,
    setFile: (file: File | null) =>
      setSelection({ file, preview: file ? URL.createObjectURL(file) : "" }),
  };
}
