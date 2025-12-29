import React, { useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, Send, Instagram, Facebook, Twitter, 
  Clock, MessageCircle, HelpCircle, Shield, Users, Headphones, CheckCircle, Zap
} from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion-lite';

const ContactUs = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    
    // Pre-fill email with all form data
    const subject = encodeURIComponent(`Quiz Dangal - ${formData.subject || 'Contact Form'}: ${formData.name}`);
    const body = encodeURIComponent(
`Hi Quiz Dangal Team,

Subject: ${formData.subject || 'General Inquiry'}

${formData.message}

---
Name: ${formData.name}
Email: ${formData.email}
Sent via Quiz Dangal Contact Form`
    );
    
    // Open default email app with pre-filled content
    window.location.href = `mailto:support@quizdangal.com?subject=${subject}&body=${body}`;
    
    setTimeout(() => {
      setSending(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  const contactInfo = [
    { 
      icon: Phone, 
      label: '+91 9587803557', 
      href: 'tel:+919587803557', 
      color: 'from-emerald-500 to-green-600',
      description: 'Call us for urgent queries'
    },
    { 
      icon: Mail, 
      label: 'support@quizdangal.com', 
      href: 'mailto:support@quizdangal.com', 
      color: 'from-violet-500 to-purple-600',
      description: 'Email for detailed inquiries'
    },
    { 
      icon: MapPin, 
      label: 'Jaipur, Rajasthan, India', 
      href: null, 
      color: 'from-orange-500 to-amber-600',
      description: 'Our headquarters location'
    },
    {
      icon: Clock,
      label: 'Mon-Sat: 10 AM - 7 PM IST',
      href: null,
      color: 'from-cyan-500 to-blue-600',
      description: 'Support hours'
    },
  ];

  const socialLinks = [
    { icon: Instagram, href: 'https://www.instagram.com/quizdangal', gradient: 'from-pink-500 via-fuchsia-500 to-purple-600', name: 'Instagram' },
    { icon: Facebook, href: 'https://www.facebook.com/profile.php?id=61576614092243', gradient: 'from-blue-500 via-blue-600 to-indigo-700', name: 'Facebook' },
    { icon: Twitter, href: 'https://x.com/quizdangal', gradient: 'from-sky-400 via-cyan-500 to-blue-600', name: 'X (Twitter)' },
  ];

  const supportCategories = [
    { icon: HelpCircle, title: 'General Inquiries', desc: 'Questions about Quiz Dangal, how it works, or getting started' },
    { icon: Users, title: 'Account Support', desc: 'Help with login, profile, password reset, or account issues' },
    { icon: Shield, title: 'Report Issues', desc: 'Report technical bugs, unfair play, or security concerns' },
    { icon: MessageCircle, title: 'Feedback & Suggestions', desc: 'Share your ideas to help us improve Quiz Dangal' },
  ];

  const faqs = [
    { 
      question: 'How quickly will I get a response?', 
      answer: 'We aim to respond to all inquiries within 24-48 hours during business days. For urgent issues, please call us directly.' 
    },
    { 
      question: 'What information should I include in my message?', 
      answer: 'Please include your registered email, a clear description of your issue or question, and any relevant screenshots if applicable.' 
    },
    { 
      question: 'Can I get help with my quiz account?', 
      answer: 'Yes! For account-related issues like password reset, profile updates, or coin balance queries, email us with your registered email address.' 
    },
    { 
      question: 'How do I report a bug or technical issue?', 
      answer: 'Please describe the issue in detail, including your device type, browser, and steps to reproduce the problem. Screenshots are very helpful!' 
    },
    { 
      question: 'Is there a phone support option?', 
      answer: 'Yes, you can call us at +91 9587803557 during business hours (Mon-Sat, 10 AM - 7 PM IST) for urgent queries.' 
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Quiz Dangal',
    description: 'Get in touch with the Quiz Dangal support team for help, feedback, partnerships, and media inquiries.',
    url: 'https://quizdangal.com/contact-us/',
    mainEntity: {
      '@type': 'Organization',
      name: 'Quiz Dangal',
      url: 'https://quizdangal.com/',
      logo: 'https://quizdangal.com/android-chrome-512x512.png',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-9587803557',
        email: 'support@quizdangal.com',
        contactType: 'customer support',
        availableLanguage: ['English', 'Hindi'],
        areaServed: 'IN',
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '10:00',
          closes: '19:00',
        },
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Jaipur',
        addressRegion: 'Rajasthan',
        addressCountry: 'India',
      },
      sameAs: [
        'https://www.instagram.com/quizdangal',
        'https://www.facebook.com/profile.php?id=61576614092243',
        'https://x.com/quizdangal',
      ],
    },
  };

  return (
    <div className="min-h-screen pt-14 text-slate-100">
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-5xl">
        <SEO
          title="Contact Us – Quiz Dangal | Customer Support & Help"
          description="Get in touch with the Quiz Dangal support team for help, feedback, partnerships, and media inquiries. Call +91 9587803557 or email support@quizdangal.com. We're here to help!"
          canonical="https://quizdangal.com/contact-us/"
          alternateLocales={['hi_IN', 'en_US']}
          keywords={[
            'quiz dangal contact',
            'quiz dangal support',
            'quiz dangal phone number',
            'quiz dangal email',
            'quiz dangal help',
            'quiz dangal customer care',
            'quiz app support india',
          ]}
          jsonLd={[contactSchema, faqSchema]}
        />

        <AnimatePresence>
          {mounted && (
            <>
              {/* Hero Section */}
              <m.header
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
                  Contact Us
                </h1>
                <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
                  We&apos;re here to help! Whether you have questions about Quiz Dangal, need technical 
                  support, or want to share feedback, our team is ready to assist you.
                </p>
              </m.header>

              {/* Contact Methods Grid */}
              <m.section
                className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {contactInfo.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-xl p-4 text-center hover:border-indigo-500/50 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    {item.href ? (
                      <a href={item.href} className="text-white font-medium text-sm hover:text-indigo-300 transition-colors block mb-1">
                        {item.label}
                      </a>
                    ) : (
                      <p className="text-white font-medium text-sm mb-1">{item.label}</p>
                    )}
                    <p className="text-slate-400 text-xs">{item.description}</p>
                  </div>
                ))}
              </m.section>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Contact Form */}
                <m.section
                  className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-2xl p-6 md:p-8 shadow-xl"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-2 rounded-full">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Send Us a Message</h2>
                  </div>
                  <p className="text-slate-300 text-sm mb-6">
                    Fill out the form below and we&apos;ll get back to you as soon as possible. 
                    All fields marked with * are required.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Your Name *</label>
                        <input
                          type="text"
                          id="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Your Email *</label>
                        <input
                          type="email"
                          id="email"
                          placeholder="Enter your email address"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
                      <select
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                      >
                        <option value="">Select a topic</option>
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Account Support">Account Support</option>
                        <option value="Technical Issue">Technical Issue / Bug Report</option>
                        <option value="Coins & Rewards">Coins & Rewards Query</option>
                        <option value="Feedback">Feedback & Suggestions</option>
                        <option value="Partnership">Partnership / Business Inquiry</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-1">Your Message *</label>
                      <textarea
                        id="message"
                        placeholder="Please describe your question or issue in detail..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                    >
                      <Send className="w-4 h-4" />
                      {sending ? 'Opening Email App...' : 'Send Message'}
                    </button>
                  </form>
                </m.section>

                {/* Support Info */}
                <m.div
                  className="space-y-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Support Categories */}
                  <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-full">
                        <Headphones className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white">How Can We Help?</h2>
                    </div>
                    <div className="space-y-3">
                      {supportCategories.map((cat, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                          <cat.icon className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="text-sm font-semibold text-white">{cat.title}</h3>
                            <p className="text-xs text-slate-400">{cat.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Response Time */}
                  <section className="bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-cyan-900/40 backdrop-blur-xl border border-emerald-700/50 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-lg font-bold text-emerald-300">Quick Response Promise</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Email responses within 24-48 hours</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Phone support during business hours</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Social media responses within 12 hours</span>
                      </li>
                    </ul>
                  </section>

                  {/* Social Links */}
                  <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-4 text-center">Connect With Us</h3>
                    <div className="flex justify-center gap-4">
                      {socialLinks.map((social, i) => (
                        <a
                          key={i}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-14 h-14 rounded-full bg-gradient-to-br ${social.gradient} flex items-center justify-center hover:scale-110 transition-transform`}
                          aria-label={`Follow Quiz Dangal on ${social.name}`}
                        >
                          <social.icon className="w-6 h-6 text-white" />
                        </a>
                      ))}
                    </div>
                    <p className="text-center text-slate-400 text-xs mt-3">
                      Follow us for updates, quiz announcements, and more!
                    </p>
                  </section>
                </m.div>
              </div>

              {/* FAQs Section */}
              <m.section
                className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-center gap-3 mb-6">
                  <HelpCircle className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400 bg-clip-text text-transparent">
                    Frequently Asked Questions
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {faqs.map((faq, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">{faq.question}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </m.section>

              {/* Additional Links */}
              <m.section
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-slate-400 text-sm mb-4">Looking for more information?</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/about-us/" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium underline underline-offset-4">
                    About Us
                  </Link>
                  <Link to="/privacy-policy/" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium underline underline-offset-4">
                    Privacy Policy
                  </Link>
                  <Link to="/terms-conditions/" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium underline underline-offset-4">
                    Terms & Conditions
                  </Link>
                </div>
              </m.section>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ContactUs;
