import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import RegisterFirst from "@/components/sections/RegisterFirst";
import About from "@/components/sections/About";
import Events from "@/components/sections/Events";
import Gallery from "@/components/sections/Gallery";
import Blog from "@/components/sections/Blog";
import ShopPreview from "@/components/sections/ShopPreview";
import JoinCTA from "@/components/sections/JoinCTA";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <RegisterFirst />
        <About />
        <Events />
        <Gallery />
        <Blog />
        <ShopPreview />
        <JoinCTA />
      </main>
      <Footer />
    </>
  );
}