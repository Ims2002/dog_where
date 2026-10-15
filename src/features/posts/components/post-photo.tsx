import Image from "next/image";

/** Foto de la publicación. Las de desarrollo (/dev-uploads) no pasan por el optimizador. */
export function PostPhoto({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={priority}
      loading={priority ? "eager" : undefined}
      unoptimized={src.startsWith("/dev-uploads/")}
      className="object-cover"
    />
  );
}
