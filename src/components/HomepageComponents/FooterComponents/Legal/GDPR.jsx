import React, { useEffect } from 'react';
import Navbar from '../../Navbar';
import Footer from '../../Footer';
import { Shield, Lock, UserCheck, FileCheck, Globe } from 'lucide-react';

const GDPR = () => {
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
            <Globe className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            GDPR Compliance
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Echo is fully committed to compliance with the General Data Protection Regulation (GDPR). We prioritize your data privacy and security.
          </p>
          <p className="mt-4 text-sm text-neutral-500">
            Last Updated: December 1, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-primary-400 hover:prose-a:text-primary-300 prose-strong:text-white">
          
          <section className="mb-12">
            <h2>What is GDPR?</h2>
            <p>
              The General Data Protection Regulation (GDPR) is a regulation in EU law on data protection and privacy in the European Union (EU) and the European Economic Area (EEA). It also addresses the transfer of personal data outside the EU and EEA areas. The GDPR's primary aim is to give control to individuals over their personal data and to simplify the regulatory environment for international business by unifying the regulation within the EU.
            </p>
          </section>

          <section className="mb-12">
            <h2>Your Rights Under GDPR</h2>
            <p>
              Echo undertakes to respect the confidentiality of your Personal Data and to guarantee you can exercise your rights. You have the right under this Privacy Policy, and by law if you are within the EU, to:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6 mt-8 not-prose">
              <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <UserCheck className="w-6 h-6 text-primary-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Request Access</h3>
                <p className="text-sm text-neutral-400">
                  The right to access, update or delete the information we have on you. Whenever made possible, you can access, update or request deletion of your Personal Data directly within your account settings section.
                </p>
              </div>

              <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <FileCheck className="w-6 h-6 text-primary-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Request Correction</h3>
                <p className="text-sm text-neutral-400">
                  The right to have any incomplete or inaccurate information we hold about you corrected.
                </p>
              </div>

              <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <Lock className="w-6 h-6 text-primary-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Object to Processing</h3>
                <p className="text-sm text-neutral-400">
                  The right to object to our processing of your Personal Data. This right exists where we are relying on a legitimate interest as the legal basis for our processing.
                </p>
              </div>

              <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <Shield className="w-6 h-6 text-primary-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Request Erasure</h3>
                <p className="text-sm text-neutral-400">
                  The right to ask us to delete or remove Personal Data when there is no good reason for us to continue processing it.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2>Data Transfer</h2>
            <p>
              Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ than those from your jurisdiction.
            </p>
            <p>
              Echo will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy and no transfer of your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of your data and other personal information.
            </p>
          </section>

          <section className="mb-12">
            <h2>Data Protection Officer</h2>
            <p>
              We have appointed a Data Protection Officer (DPO) who is responsible for overseeing questions in relation to this privacy policy. If you have any questions about this privacy policy, including any requests to exercise your legal rights, please contact the DPO using the details set out below.
            </p>
            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 mt-6 not-prose">
              <h3 className="text-white font-semibold mb-2">Contact Details</h3>
              <ul className="space-y-2 text-neutral-400">
                <li><strong className="text-white">Full name of legal entity:</strong> Echo Technologies Ltd.</li>
                <li><strong className="text-white">Email address:</strong> <a href="mailto:dpo@echo.app" className="text-primary-400 hover:text-primary-300">dpo@echo.app</a></li>
                <li><strong className="text-white">Postal address:</strong> 123 Tech Boulevard, Dublin, Ireland</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2>Complaints</h2>
            <p>
              You have the right to make a complaint at any time to the Data Protection Commission (DPC), the Irish supervisory authority for data protection issues (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">www.dataprotection.ie</a>). We would, however, appreciate the chance to deal with your concerns before you approach the DPC so please contact us in the first instance.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GDPR;
