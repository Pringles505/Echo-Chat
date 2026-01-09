import React, { useEffect } from 'react';
import Navbar from '../../Navbar';
import Footer from '../../Footer';
import { FileText, AlertTriangle } from 'lucide-react';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans selection:bg-primary-500/30">
      <Navbar />
      
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-primary-500/10 rounded-2xl mb-6 ring-1 ring-primary-500/20">
            <FileText className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully before using Echo. By accessing or using our Service, you agree to be bound by these Terms.
          </p>
          <p className="mt-4 text-sm text-neutral-500">
            Last Updated: December 1, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-primary-400 hover:prose-a:text-primary-300 prose-strong:text-white">
          
          <section className="mb-12">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Echo application, website, and services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
            </p>
            <p>
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section className="mb-12">
            <h2>2. Accounts</h2>
            <p>
              When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
            <p>
              You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </section>

          <section className="mb-12">
            <h2>3. User Conduct</h2>
            <p>
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable national or international law or regulation.</li>
              <li>Exploit, harm, or attempt to exploit or harm minors in any way.</li>
              <li>Transmit any unsolicited or unauthorized advertising or promotional material (spam).</li>
              <li>Impersonate or attempt to impersonate Echo, an Echo employee, another user, or any other person or entity.</li>
              <li>Engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm Echo or users of the Service or expose them to liability.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2>4. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of Echo Technologies Ltd. and its licensors. The Service is protected by copyright, trademark, and other laws of both Ireland and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Echo Technologies Ltd.
            </p>
          </section>

          <section className="mb-12">
            <h2>5. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
            <p>
              Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or delete your account through the app settings.
            </p>
          </section>

          <section className="mb-12">
            <h2>6. Limitation of Liability</h2>
            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 not-prose">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-neutral-300 mb-4">
                    In no event shall Echo Technologies Ltd., nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-neutral-400">
                    <li>Your access to or use of or inability to access or use the Service;</li>
                    <li>Any conduct or content of any third party on the Service;</li>
                    <li>Any content obtained from the Service; and</li>
                    <li>Unauthorized access, use or alteration of your transmissions or content.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2>7. Disclaimer</h2>
            <p>
              Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
            </p>
            <p>
              Echo Technologies Ltd. does not warrant that a) the Service will function uninterrupted, secure or available at any particular time or location; b) any errors or defects will be corrected; c) the Service is free of viruses or other harmful components; or d) the results of using the Service will meet your requirements.
            </p>
          </section>

          <section className="mb-12">
            <h2>8. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of Ireland, without regard to its conflict of law provisions.
            </p>
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
            </p>
          </section>

          <section className="mb-12">
            <h2>9. Changes</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
            <p>
              By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
            </p>
          </section>

          <section className="mb-12">
            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-none pl-0 space-y-2">
              <li>By email: <a href="mailto:legal@echo.app">legal@echo.app</a></li>
            </ul>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
