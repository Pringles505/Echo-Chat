import Navbar from '../../Navbar';
import Footer from '../../Footer';
import ParticlesBackground from '../../ParticlesBackground';

function CookiePolicy() {
  return (
    <div className="min-h-screen bg-primary-1000 text-white font-sans">
      <ParticlesBackground />
      <Navbar />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8 text-center">Cookie Policy</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-white/80 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="mb-4">
              Cookies are small text files stored on your device when you visit our website. 
              They help ECHO provide you with a better experience by remembering your preferences.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="mb-4">We use cookies for:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Essential website functionality</li>
              <li>Performance tracking and analytics</li>
              <li>Personalizing your experience</li>
              <li>Remembering your preferences</li>
            </ul>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies</h2>
            <p className="mb-4">We use different types of cookies:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Strictly Necessary:</strong> Required for basic functions</li>
              <li><strong>Performance:</strong> Help us understand visitor behavior</li>
              <li><strong>Functional:</strong> Remember your preferences</li>
              <li><strong>Targeting:</strong> Used for advertising purposes</li>
            </ul>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="mb-4">
              You can control cookies through your browser settings. However, disabling essential 
              cookies may affect website functionality.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Changes to This Policy</h2>
            <p>
              We may update our Cookie Policy periodically. The "Last updated" date at the top 
              indicates when changes were made.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CookiePolicy;