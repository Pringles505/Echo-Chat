import Navbar from '../../Navbar.jsx';
import Footer from '../../Footer.jsx';
import ParticlesBackground from '../../ParticlesBackground.jsx';

function TermsOfService() {
  return (
    <div className="min-h-screen bg-primary-1000 text-white font-sans">
      <ParticlesBackground />
      <Navbar />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8 text-center">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-white/80 mb-6">Effective date: {new Date().toLocaleDateString()}</p>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing or using ECHO , you agree to be bound by these Terms of Service.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="mb-4">
              ECHO provides intuitive tools for digital creators, including [brief description of your main features].
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <p className="mb-4">You agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not interfere with or disrupt the Service</li>
            </ul>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
            <p className="mb-4">
              All content included on the Service, such as text, graphics, logos, is the property of ECHO and protected by copyright laws.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
            <p className="mb-4">
              ECHO shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the Service.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">6. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account immediately, without prior notice, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of Spain, without regard to its conflict of law provisions.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default TermsOfService;