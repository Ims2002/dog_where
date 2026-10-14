export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-brand text-sm font-semibold tracking-wide uppercase">En construcción</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">DogWhere</h1>
      <p className="text-lg text-stone-600 dark:text-stone-300">
        ¿Has encontrado un perro o un gato perdido? Pronto podrás publicar su foto, los datos de su
        chapa y dónde está (en tu casa, en una protectora o los sitios donde lo has visto) para que
        su familia lo encuentre.
      </p>
    </main>
  );
}
