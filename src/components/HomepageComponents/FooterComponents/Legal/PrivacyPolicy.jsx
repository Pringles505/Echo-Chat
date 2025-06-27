import Navbar from '../../Navbar.jsx';
import Footer from '../../Footer.jsx';
import ParticlesBackground from '../../ParticlesBackground.jsx';

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-primary-1000 text-white font-sans">
      <ParticlesBackground />
      <Navbar />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8 text-center">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-white/80 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to ECHO ("we", "our", or "us"). We respect your privacy and are committed to protecting your personal data.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>
            <p className="mb-4">We may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Personal identification information (Name, email address, phone number)</li>
              <li>Usage data (how you use our website, products, and services)</li>
              <li>Technical data (IP address, browser type and version)</li>
            </ul>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
            <p className="mb-4">We use your data to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Provide and maintain our service</li>
              <li>Notify you about changes to our service</li>
              <li>Allow you to participate in interactive features</li>
              <li>Provide customer support</li>
              <li>Gather analysis to improve our service</li>
            </ul>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Data Protection</h2>
            <p className="mb-4">
              We implement appropriate security measures to protect your personal data from unauthorized access, alteration, or disclosure.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p className="mb-4">
              You have the right to access, update, or delete your personal information. Contact us at privacy@echo.example to exercise these rights.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PrivacyPolicy;