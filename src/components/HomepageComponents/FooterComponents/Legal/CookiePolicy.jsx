import React, { useEffect } from 'react';
import Navbar from '../../Navbar';
import Footer from '../../Footer';
import { Cookie, Info, Settings, ShieldCheck } from 'lucide-react';

const CookiePolicy = () => {
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
            <Cookie className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            This Cookie Policy explains how Echo uses cookies and similar technologies to recognize you when you visit our website or use our app.
          </p>
          <p className="mt-4 text-sm text-neutral-500">
            Last Updated: December 1, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-primary-400 hover:prose-a:text-primary-300 prose-strong:text-white">
          
          <section className="mb-12">
            <h2>1. What are cookies?</h2>
            <p>
              Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
            </p>
            <p>
              Cookies set by the website owner (in this case, Echo) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics).
            </p>
          </section>

          <section className="mb-12">
            <h2>2. Why do we use cookies?</h2>
            <p>
              We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Online Properties. Third parties serve cookies through our Website for advertising, analytics, and other purposes.
            </p>
          </section>

          <section className="mb-12">
            <h2>3. Types of Cookies We Use</h2>
            
            <div className="grid gap-6 mt-8 not-prose">
              {/* Essential Cookies */}
              <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <div className="flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Essential Cookies</h3>
                    <p className="text-neutral-400 text-sm">
                      These cookies are strictly necessary to provide you with services available through our Website and to use some of its features, such as access to secure areas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Cookies */}
              <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <div className="flex items-start gap-4">
                  <Settings className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Performance & Functionality Cookies</h3>
                    <p className="text-neutral-400 text-sm">
                      These cookies are used to enhance the performance and functionality of our Website but are non-essential to their use. However, without these cookies, certain functionality (like videos) may become unavailable.
                    </p>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <div className="flex items-start gap-4">
                  <Info className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Analytics & Customization Cookies</h3>
                    <p className="text-neutral-400 text-sm">
                      These cookies collect information that is used either in aggregate form to help us understand how our Website is being used or how effective our marketing campaigns are, or to help us customize our Website for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2>4. How can I control cookies?</h2>
            <p>
              You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager. The Cookie Consent Manager allows you to select which categories of cookies you accept or reject. Essential cookies cannot be rejected as they are strictly necessary to provide you with services.
            </p>
            <p>
              The Cookie Consent Manager can be found in the notification banner and on our website. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted. You may also set or amend your web browser controls to accept or refuse cookies.
            </p>
          </section>

          <section className="mb-12">
            <h2>5. Local Storage</h2>
            <p>
              In addition to cookies, we may use other technologies like Local Storage (LS) to store and retrieve data on your device. Local Storage allows us to save your preferences and settings locally on your browser, so you don't have to re-enter them every time you visit. This data is stored securely and is not shared with third parties.
            </p>
          </section>

          <section className="mb-12">
            <h2>6. Updates to this Policy</h2>
            <p>
              We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
            </p>
          </section>

          <section className="mb-12">
            <h2>7. More Information</h2>
            <p>
              If you have any questions about our use of cookies or other technologies, please email us at <a href="mailto:privacy@echo.app">privacy@echo.app</a>.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
