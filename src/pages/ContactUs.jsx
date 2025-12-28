import React, { useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import { Mail, Phone, MapPin, Send, Instagram, Facebook, Twitter } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion-lite';

const ContactUs = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    
    // Pre-fill email with all form data
    const subject = encodeURIComponent(`Quiz Dangal - Message from ${formData.name}`);
    const body = encodeURIComponent(
`Hi Quiz Dangal Team,

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
      setFormData({ name: '', email: '', message: '' });
    }, 1500);
  };

  const contactInfo = [
    { icon: Phone, label: '+91 9587803557', href: 'tel:+919587803557', color: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/40' },
    { icon: Mail, label: 'support@quizdangal.com', href: 'mailto:support@quizdangal.com', color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/40' },
    { icon: MapPin, label: 'Jaipur, Rajasthan, India', href: null, color: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/40' },
  ];

  const socialLinks = [
    { icon: Instagram, href: 'https://www.instagram.com/quizdangal', gradient: 'from-pink-500 via-fuchsia-500 to-purple-600', shadow: 'shadow-pink-500/50' },
    { icon: Facebook, href: 'https://www.facebook.com/profile.php?id=61576614092243', gradient: 'from-blue-500 via-blue-600 to-indigo-700', shadow: 'shadow-blue-500/50' },
    { icon: Twitter, href: 'https://x.com/quizdangal', gradient: 'from-sky-400 via-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/50' },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center">
      <SEO
        title="Contact Us – Quiz Dangal"
        description="Get in touch with the Quiz Dangal support team for help, partnerships, and media inquiries."
        canonical="https://quizdangal.com/contact-us/"
        alternateLocales={['hi_IN', 'en_US']}
        keywords={['quiz dangal contact', 'quiz dangal support', 'quiz dangal phone', 'quiz dangal email']}
      />

      <div className="w-full px-4 max-w-md relative">
        <AnimatePresence>
          {mounted && (
            <>
              {/* Header */}
              <m.h1 
                className="text-center text-4xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
              >
                Contact Us
              </m.h1>

              {/* Contact Card */}
              <m.div 
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
              >
                {/* Contact Info */}
                <div className="space-y-3 mb-4">
                  {contactInfo.map((item, i) => (
                    <m.div 
                      key={i} 
                      className="flex items-center gap-3 group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                    >
                      <div 
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      {item.href ? (
                        <a 
                          href={item.href} 
                          className="text-slate-200 hover:text-white transition-all text-sm font-medium group-hover:translate-x-2 duration-300"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className="text-slate-200 text-sm font-medium">{item.label}</span>
                      )}
                    </m.div>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-800 mb-4" />

                {/* Contact Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <input
                      type="email"
                      placeholder="Your Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                  <textarea
                    placeholder="Write your message..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Opening Email...' : 'Send Message'}
                  </button>
                </form>
              </m.div>

              {/* Social Links */}
              <div className="mt-4 flex justify-center gap-5">
                  {socialLinks.map((social, i) => (
                    <a
                      key={i}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-14 h-14 rounded-full bg-gradient-to-br ${social.gradient} flex items-center justify-center`}
                    >
                      <social.icon className="w-6 h-6 text-white" />
                    </a>
                  ))}
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ContactUs;
