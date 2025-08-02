"use client";

export default function Home() {
  return (
    <div>
      <main className="flex flex-col gap-8 items-center text-center px-4">
        <h1 className="text-5xl text-indigo-500 font-bold py-10">
          Current Queue is <br/> 123
        </h1>

        <div className="w-full max-w-md px-6 py-10 border-2 shadow-lg rounded-[30px] bg-white">
          เนื้อหาหรือฟอร์มต่าง ๆ ที่จะขยายตามความสูงที่เหมาะสม
        </div>
      </main>

      <footer className="mt-10 flex gap-6 flex-wrap items-center justify-center"></footer>
    </div>
  );
}
