import Navbar from '../../Navbar';
import Footer from '../../Footer';
import ParticlesBackground from '../../ParticlesBackground';

function GDPR() {
  return (
    <div className="min-h-screen bg-primary-1000 text-white font-sans">
      <ParticlesBackground />
      <Navbar />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8 text-center">GDPR Compliance</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-white/80 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">1. Data Protection</h2>
            <p className="mb-4">
              ECHO complies with the General Data Protection Regulation (GDPR). We process personal 
              data lawfully, fairly, and transparently.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. Your Rights</h2>
            <p className="mb-4">Under GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Restrict or object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">3. Data Collection</h2>
            <p className="mb-4">
              We collect only necessary personal data for providing our services, with your explicit 
              consent when required.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your personal 
              data against unauthorized access or disclosure.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
            <p>
              For any GDPR-related inquiries or to exercise your rights, please contact our 
              Data Protection Officer at <span className="text-[#514b96]">contact@echo</span>.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default GDPR;