/**
 * Category SEO content for the expandable "Read More" panel on category lobby pages.
 * 200–300 word keyword-rich introductions rendered in initial DOM (CSS-hidden, not JS-hidden)
 * so search engines can index the full text.
 */

const CATEGORY_SEO = {
  opinion: {
    heading: 'Why Opinion Quizzes Are India\u2019s Hottest Quiz Trend in 2026',
    paragraphs: [
      'Opinion quizzes on Quiz Dangal are changing how India plays trivia online. Unlike traditional right-or-wrong GK quizzes, opinion quizzes let you share your honest take on trending topics \u2014 from IPL 2026 team rankings and Bollywood debates to daily current affairs polls and viral social media moments. The twist? You earn points when your answer matches the majority opinion, making every quiz a fun social experiment.',
      'Every 5 minutes, a brand-new opinion poll goes live on Quiz Dangal, giving you non-stop opportunities to test whether you think like most Indians \u2014 or if you\u2019re the contrarian in the room. Topics range from \u201CWhich IPL team will win tonight?\u201D and \u201CBest Bollywood dialogue of 2026\u201D to current affairs picks like \u201CShould India host the 2036 Olympics?\u201D and trending pop-culture face-offs.',
      'What makes Quiz Dangal\u2019s opinion quizzes addictive is the real-time competition. You can see how many players joined, track your ranking on live leaderboards, and win coins and cash prizes for matching popular opinions fast. Whether you are prepping for SSC exams, killing time during your commute, or just love debating with friends, opinion quizzes deliver excitement, rewards, and bragging rights \u2014 all in under 5 minutes.',
      'Join thousands of daily players from across India. Play free opinion quizzes in Hindi and English, compete on leaderboards, grow your streak, and redeem coins for real rewards. Quiz Dangal \u2014 where your opinion actually pays off!',
    ],
  },
  gk: {
    heading: 'Sharpen Your Mind with Daily GK Quizzes on Quiz Dangal',
    paragraphs: [
      'General Knowledge quizzes on Quiz Dangal are designed for ambitious learners, competitive exam aspirants, and trivia lovers across India. Whether you are preparing for SSC CGL, UPSC, banking exams, or simply want to stay sharp on current affairs, our daily GK rounds cover everything \u2014 from Indian history and geography to science, polity, economy, and IPL 2026 sports awareness.',
      'New GK quizzes go live every 5 minutes on Quiz Dangal, each packed with 10 carefully curated questions that test your speed and accuracy. Unlike boring mock tests, every GK round is a real-time competition: answer fast, beat other players, and climb the live leaderboard to win coins and cash prizes. It\u2019s exam preparation that actually feels fun.',
      'Our GK question bank is updated daily with the latest current affairs for March 2026, trending news, and seasonal topics like IPL stats, Union Budget highlights, and international sports events. Questions come in both Hindi and English, making Quiz Dangal accessible for students across all Indian states \u2014 from Delhi and Mumbai to Patna and Lucknow.',
      'What sets Quiz Dangal apart? Speed matters. In every GK quiz, tie-breakers reward the fastest correct answer, so it is not just about what you know \u2014 it is about how quickly you recall it. Perfect training for competitive exams where every second counts. Play free GK quizzes daily, track your progress on weekly leaderboards, and earn rewards!',
    ],
  },
};

export function getCategorySeoContent(slug) {
  const key = String(slug || '').toLowerCase();
  if (key.includes('opinion')) return CATEGORY_SEO.opinion;
  if (key.includes('gk')) return CATEGORY_SEO.gk;
  return {
    heading: 'Play Daily Quizzes & Win Prizes on Quiz Dangal',
    paragraphs: [
      'Quiz Dangal is India\u2019s premier daily quiz platform where players compete in real-time trivia rounds to win coins and cash prizes. With new quizzes every 5 minutes across Opinion and GK categories, there is always something to play. Join thousands of daily players, test your knowledge, and climb the leaderboards. Play free in Hindi and English \u2014 your next quiz starts in minutes!',
    ],
  };
}
