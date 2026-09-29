import DemoWorkspace from "../components/DemoWorkspace";
import Header from "../components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto grid w-full max-w-5xl grid-cols-1 content-start gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[20rem_1fr]">
        <DemoWorkspace />
      </main>
    </>
  );
}
