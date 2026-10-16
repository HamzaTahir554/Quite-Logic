import BrandName from "./BrandName";
export default function BrandText({ children }: { children: string }) {
  const parts = children.split("Quite Logic");
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <BrandName />}
          {part}
        </span>
      ))}
    </>
  );
}
