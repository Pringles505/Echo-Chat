import Navbar from './HomepageComponents/Navbar';
import Footer from './HomepageComponents/Footer';
import HeroAnimation from './HomepageComponents/HeroAnimation';
import Hero from './landing/Hero';
import Features from './landing/Features';
import CodeTypingSection from './landing/CodeTypingSection';
import HeroAiDemo from './landing/HeroAiDemo';
import CipherPlayground from './landing/CipherPlayground';
import KeyExchangeVisualizer from './landing/KeyExchangeVisualizer';
import SecurityDocs from './landing/SecurityDocs';
import Pricing from './landing/Pricing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 font-sans">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CodeTypingSection />
        <HeroAiDemo />
        <HeroAnimation />
        <CipherPlayground />
        <KeyExchangeVisualizer />
        <SecurityDocs />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
