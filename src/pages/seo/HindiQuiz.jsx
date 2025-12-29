import React from 'react';
import SeoLanding from './SeoLanding';
import { BookOpen, Users, Gift, Star } from 'lucide-react';

export default function HindiQuiz() {
  const features = [
    { icon: BookOpen, title: 'Hindi Mein Sawaal', desc: 'GK, Sports, Movies aur Current Affairs ke questions Hindi mein' },
    { icon: Users, title: 'Desh Bhar Se Competition', desc: 'Puri India ke players ke saath compete karo leaderboards par' },
    { icon: Gift, title: 'Free Rewards', desc: 'Sahi jawab do, coins kamao, aur exciting rewards jito' },
    { icon: Star, title: 'Daily Fresh Content', desc: 'Roz naye quizzes add hote hain — kabhi boring nahi' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Hindi Quiz Categories</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📚 Samanya Gyan (GK)</h3>
          <p>Itihas, Bhugol, Vigyan, Rajniti, aur Samanya Gyan ke sawaal. UPSC, SSC, aur state exams ke liye helpful.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏏 Khel Quiz</h3>
          <p>Cricket, Football, Olympics, aur Indian sports heroes ke baare mein interesting sawaal.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🎬 Bollywood Quiz</h3>
          <p>Hindi movies, dialogues, actors, songs, aur filmi trivia. Bollywood fans ke liye perfect!</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">💭 Opinion Polls</h3>
          <p>Trending topics par apni raay do aur dekho ki baaki log kya sochte hain!</p>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/hindi-quiz"
      title="Hindi Quiz – Online Quiz in Hindi | Quiz Dangal"
      h1="Hindi Quiz (Quiz in Hindi)"
      description="Hindi quiz ke liye Quiz Dangal par daily fun quizzes khelo — GK, sports, movies, aur opinion rounds. Fast, mobile-friendly, and free to start."
      keywords={[
        'hindi quiz', 'quiz in hindi', 'online quiz', 'india quiz', 'gk quiz',
        'hindi gk quiz', 'samanya gyan quiz', 'hindi trivia', 'quiz hindi mein'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { href: '/category/gk/', label: 'GK Quiz' },
        { href: '/quiz-questions/', label: 'Quiz Questions' },
        { href: '/leaderboards/', label: 'Leaderboards' },
        { href: '/gk-quiz/', label: 'GK Quiz Landing' },
        { href: '/india-quiz/', label: 'India Quiz' },
      ]}
      faqs={[
        {
          question: 'Kya Hindi me quiz available hai?',
          answer: 'Haan, bilkul! Quiz Dangal par bahut saare quizzes Hindi mein available hain. Hum Indian audience ke liye content banate hain jo easy-to-understand aur engaging ho. GK, Sports, Movies, aur Opinion categories mein Hindi content milega.',
        },
        {
          question: 'Quiz kaise play karein?',
          answer: 'Simple hai! Home page par jaao, apni pasandida category select karo (GK, Sports, Movies), aur quiz start karo. Login karke khelo taaki aapki coins, streaks, aur leaderboard position save ho sake.',
        },
        {
          question: 'Kya ye quiz bilkul free hai?',
          answer: 'Haan, 100% free hai! Koi entry fee nahi, koi hidden charges nahi. Aap jitne chaaho utne quizzes khelo bina kuch pay kiye. Hum ads se revenue earn karte hain, aapko kabhi pay nahi karna.',
        },
        {
          question: 'Coins kaise kamaye aur rewards kaise milenge?',
          answer: 'Har sahi jawab par coins milte hain. Jitna fast answer karoge, utne zyada bonus coins milenge. In coins ko exciting rewards ke liye redeem kar sakte ho. Regular khelo aur coins accumulate karo!',
        },
        {
          question: 'Kya ye competitive exams ke liye helpful hai?',
          answer: 'Haan! Humare GK aur Current Affairs quizzes UPSC, SSC, Banking, Railways, aur state exams mein puche jaane wale topics cover karte hain. Regular practice se aapki preparation strong hogi.',
        },
        {
          question: 'Mobile par quiz kaise khelein?',
          answer: 'Apne phone ke browser mein quizdangal.com kholo aur quiz start karo. Koi app download karne ki zarurat nahi. PWA feature use karke home screen par add bhi kar sakte ho quick access ke liye.',
        },
        {
          question: 'Roz naye questions aate hain?',
          answer: 'Haan! Hum daily fresh quizzes add karte hain sabhi categories mein. Current affairs ke questions latest news ke according update hote hain. Roz khelo aur naya seekho!',
        },
      ]}
    />
  );
}
