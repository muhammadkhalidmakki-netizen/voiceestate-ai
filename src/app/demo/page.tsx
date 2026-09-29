import DemoWorkspace from "../../components/DemoWorkspace";
import Header from "../../components/Header";

export default function Home() {
  return (
    // "home" only supplies the same near-black text colors as the homepage
    <div className="home">
      <Header />
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 content-start items-start gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <DemoWorkspace />
      </main>
    </div>
  );
}
