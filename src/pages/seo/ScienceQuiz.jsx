import React from 'react';
import SeoLanding from './SeoLanding';
import { Atom, Microscope, Rocket, Lightbulb } from 'lucide-react';

export default function ScienceQuiz() {
  const features = [
    { icon: Atom, title: 'Physics & Chemistry', desc: 'Laws of motion, chemical reactions, elements, and forces' },
    { icon: Microscope, title: 'Biology', desc: 'Human body, plants, animals, cells, and ecosystems' },
    { icon: Rocket, title: 'Space Science', desc: 'ISRO missions, planets, stars, galaxies, and space exploration' },
    { icon: Lightbulb, title: 'Inventions', desc: 'Scientific discoveries, famous scientists, and technology' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Science Quiz Topics</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">⚛️ Physics</h3>
          <p>Newton&apos;s laws, electricity, magnetism, optics, thermodynamics, and modern physics concepts.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🧪 Chemistry</h3>
          <p>Periodic table, chemical reactions, acids & bases, organic chemistry, and everyday chemistry.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🧬 Biology</h3>
          <p>Human anatomy, genetics, plants, animals, ecology, diseases, and health science.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🚀 Space & Technology</h3>
          <p>ISRO achievements, NASA missions, satellites, planets, and latest tech innovations.</p>
        </div>
      </div>
      <div className="mt-4 bg-purple-900/20 border border-purple-700/30 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">🎓 Perfect for Students</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Our science quizzes cover topics from school curriculum as well as competitive exam syllabus. 
          Whether you&apos;re preparing for board exams, NEET, JEE, or general science awareness for 
          government exams, regular practice here will strengthen your science fundamentals.
        </p>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/science-quiz"
      title="Science Quiz – Practice Science Questions Online | Quiz Dangal"
      h1="Science Quiz"
      description="Enjoy science-style quiz practice on Quiz Dangal with fast, mobile-first rounds. Mix science knowledge with daily GK and themed quizzes."
      keywords={[
        'science quiz', 'science quiz questions', 'quiz questions', 'online quiz',
        'physics quiz', 'chemistry quiz', 'biology quiz', 'science gk'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/quiz-questions/', label: 'Quiz Questions' },
        { to: '/category/gk/', label: 'GK Quiz' },
        { to: '/online-quiz/', label: 'Online Quiz' },
        { to: '/maths-quiz/', label: 'Maths Quiz' },
        { to: '/general-knowledge-quiz/', label: 'General Knowledge Quiz' },
      ]}
      faqs={[
        {
          question: 'What science topics are covered?',
          answer: 'We cover Physics (mechanics, electricity, optics), Chemistry (elements, reactions, organic chemistry), Biology (human body, plants, animals, genetics), Space Science (ISRO, NASA, planets), and Technology (inventions, innovations). New content is added regularly.',
        },
        {
          question: 'Is this helpful for NEET or JEE preparation?',
          answer: 'Our science quizzes cover fundamental concepts from Physics, Chemistry, and Biology that are part of NEET and JEE syllabi. While we focus on quick quiz practice, the content reinforces important concepts. Use alongside detailed study materials.',
        },
        {
          question: 'Do you have questions about ISRO and space?',
          answer: 'Yes! We have questions about ISRO missions (Chandrayaan, Mangalyaan), Indian satellites, astronauts, and space exploration. These are popular in competitive exams and general knowledge rounds.',
        },
        {
          question: 'Are science questions updated with new discoveries?',
          answer: 'Yes! We add questions about recent scientific achievements, new ISRO launches, Nobel Prize winners in science, and latest technology developments. Stay updated with current science news through our quizzes.',
        },
        {
          question: 'Can I play science quiz on mobile?',
          answer: 'Absolutely! Quiz Dangal is optimized for mobile browsers. The interface works smoothly on smartphones and tablets. Perfect for practicing science on the go between classes or during commutes.',
        },
        {
          question: 'Is the science quiz free?',
          answer: 'Yes, 100% free! Play unlimited science quiz rounds, earn coins for correct answers, and improve your science knowledge without paying anything. No subscriptions or hidden charges.',
        },
        {
          question: 'Are answers and explanations provided?',
          answer: 'Yes! After completing each quiz, you can see all questions with correct answers. This helps you understand scientific concepts better and learn from any mistakes you made.',
        },
      ]}
    />
  );
}
