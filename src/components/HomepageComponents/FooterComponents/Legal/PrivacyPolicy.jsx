import React, { useEffect } from 'react';
import Navbar from '../../Navbar';
import Footer from '../../Footer';
import { Shield, Lock, Eye, FileText, Server, UserCheck } from 'lucide-react';

const PrivacyPolicy = () => {
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
            <Shield className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            We believe privacy is a fundamental human right. This policy outlines how Echo protects your data in compliance with the GDPR and other global privacy laws.
          </p>
          <p className="mt-4 text-sm text-neutral-500">
            Last Updated: December 1, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-primary-400 hover:prose-a:text-primary-300 prose-strong:text-white">
          
          <section className="mb-12">
            <h2>1. Introduction</h2>
            <p>
              Echo ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our secure messaging application and website (collectively, the "Service").
            </p>
            <p>
              We operate in strict compliance with the General Data Protection Regulation (GDPR) (EU) 2016/679 and other applicable privacy laws. By using Echo, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="mb-12">
            <h2>2. Data Controller</h2>
            <p>
              For the purposes of the GDPR, the Data Controller is:
            </p>
            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 not-prose">
              <p className="text-white font-semibold">Echo Technologies Ltd.</p>
              <p className="text-neutral-400">123 Privacy Lane, Tech District</p>
              <p className="text-neutral-400">Dublin, Ireland</p>
              <p className="text-neutral-400 mt-2">Data Protection Officer: <a href="mailto:dpo@echo.app" className="text-primary-400 hover:underline">dpo@echo.app</a></p>
            </div>
          </section>

          <section className="mb-12">
            <h2>3. Information We Collect</h2>
            <p>
              Our guiding principle is data minimization. We only collect what is strictly necessary to provide our Service.
            </p>
            
            <h3>3.1. Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> When you register, we may collect your email address or phone number to create your account. We do not require your real name.</li>
              <li><strong>Profile Information:</strong> You may choose to add a profile picture or display name. This is end-to-end encrypted in transit but visible to your contacts.</li>
              <li><strong>Support Communications:</strong> If you contact us, we collect the content of your message and your contact details to respond to your inquiry.</li>
            </ul>

            <h3>3.2. Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Log Data:</strong> We collect minimal server logs for security and debugging (e.g., IP addresses during connection attempts). These logs are automatically rotated and deleted every 7 days.</li>
              <li><strong>Device Information:</strong> We may collect information about your device type and operating system to optimize the app experience.</li>
              <li><strong>Usage Data:</strong> Anonymous, aggregated statistics about feature usage (e.g., "10,000 messages sent today") without identifying individual users.</li>
            </ul>

            <h3>3.3. What We DO NOT Collect</h3>
            <div className="bg-primary-900/10 border-l-4 border-primary-500 p-6 my-6 not-prose">
              <h4 className="text-lg font-bold text-primary-400 mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                End-to-End Encryption
              </h4>
              <p className="text-neutral-300">
                <strong>We cannot read your messages or listen to your calls.</strong> All content is end-to-end encrypted using the Signal Protocol. The decryption keys are stored only on your device. We have zero knowledge of your private communications.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2>4. Legal Basis for Processing</h2>
            <p>Under the GDPR, we process your data based on the following legal grounds:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contractual Necessity:</strong> To provide the Service you requested (e.g., routing messages).</li>
              <li><strong>Legitimate Interests:</strong> To improve our Service, ensure security, and prevent fraud.</li>
              <li><strong>Consent:</strong> For optional features (e.g., crash reporting) or marketing communications, which you can withdraw at any time.</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2>5. How We Use Your Information</h2>
            <p>We use your data solely for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve the Service.</li>
              <li>To authenticate your identity and prevent unauthorized access.</li>
              <li>To route messages and calls to the correct recipients.</li>
              <li>To provide customer support and respond to your requests.</li>
              <li>To detect, prevent, and address technical issues or security breaches.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2>6. Data Sharing and Disclosures</h2>
            <p>We do not sell your personal data. We may share information only in the following limited circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Providers:</strong> We use trusted third-party processors (e.g., hosting providers like AWS or Google Cloud) who are contractually bound to protect your data and process it only on our instructions.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, such as a court order. However, because your messages are end-to-end encrypted, we cannot disclose their content.</li>
              <li><strong>Business Transfers:</strong> If Echo is involved in a merger, acquisition, or asset sale, your information may be transferred, subject to the same privacy protections.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2>7. International Data Transfers</h2>
            <p>
              Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction. If you are located in the European Economic Area (EEA), and we transfer your data to a country without an adequacy decision, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs) approved by the European Commission.
            </p>
          </section>

          <section className="mb-12">
            <h2>8. Your Data Protection Rights (GDPR)</h2>
            <p>If you are a resident of the EEA, you have the following rights:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
              <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Eye className="w-4 h-4 text-primary-400"/> Right to Access</h4>
                <p className="text-sm text-neutral-400">Request copies of your personal data.</p>
              </div>
              <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary-400"/> Right to Rectification</h4>
                <p className="text-sm text-neutral-400">Correct inaccurate or incomplete information.</p>
              </div>
              <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary-400"/> Right to Erasure</h4>
                <p className="text-sm text-neutral-400">Request deletion of your personal data ("Right to be Forgotten").</p>
              </div>
              <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Server className="w-4 h-4 text-primary-400"/> Right to Portability</h4>
                <p className="text-sm text-neutral-400">Receive your data in a structured, machine-readable format.</p>
              </div>
            </div>
            <p>
              To exercise these rights, please contact us at <a href="mailto:privacy@echo.app">privacy@echo.app</a>. We will respond within one month.
            </p>
          </section>

          <section className="mb-12">
            <h2>9. Data Retention</h2>
            <p>
              We retain your personal data only for as long as is necessary for the purposes set out in this Privacy Policy.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Messages:</strong> Stored on our servers only until delivered. Once delivered, they are deleted from our servers. Undelivered messages are deleted after 30 days.</li>
              <li><strong>Account Info:</strong> Retained until you delete your account.</li>
              <li><strong>Logs:</strong> Retained for 7 days and then overwritten.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2>10. Children's Privacy</h2>
            <p>
              Our Service is not intended for anyone under the age of 16 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 16. If you are a parent or guardian and you are aware that your Child has provided us with Personal Data, please contact us.
            </p>
          </section>

          <section className="mb-12">
            <h2>11. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section className="mb-12">
            <h2>12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none pl-0 space-y-2">
              <li>By email: <a href="mailto:privacy@echo.app">privacy@echo.app</a></li>
              <li>By visiting this page on our website: <a href="/contact-us">echo.app/contact-us</a></li>
            </ul>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
