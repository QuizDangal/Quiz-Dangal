import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import CookieConsent from '@/components/CookieConsent';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import Header from '@/components/Header';
import PWAInstallButton from '@/components/PWAInstallButton';
import Home from '@/pages/Home';
// OnboardingFlow removed (unused)
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
const MyQuizzes = lazy(() => import('@/pages/MyQuizzes'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const Profile = lazy(() => import('@/pages/Profile'));
const Login = lazy(() => import('@/pages/Login'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AboutUs = lazy(() => import('@/pages/AboutUs'));
const ContactUs = lazy(() => import('@/pages/ContactUs'));
const TermsConditions = lazy(() => import('@/pages/TermsConditions'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Quiz = lazy(() => import('@/pages/Quiz'));
const CategoryQuizzes = lazy(() => import('@/pages/CategoryQuizzes'));
// Unified Admin panel now lives in Admin.jsx
const Admin = lazy(() => import('@/pages/Admin'));
const Results = lazy(() => import('@/pages/Results'));
const Leaderboards = lazy(() => import('@/pages/Leaderboards'));
const Redemptions = lazy(() => import('@/pages/Redemptions'));
const ReferEarn = lazy(() => import('@/pages/ReferEarn'));
const PlayWinQuiz = lazy(() => import('@/pages/PlayWinQuiz'));
const OpinionQuiz = lazy(() => import('@/pages/OpinionQuiz'));
const ReferEarnInfo = lazy(() => import('@/pages/ReferEarnInfo'));
const NotificationsDebug = lazy(() => import('@/pages/NotificationsDebug'));
// SEO landing pages (keyword-targeted)
const QuizQuestions = lazy(() => import('@/pages/seo/QuizQuestions'));
const QuizQuestionsWithAnswers = lazy(() => import('@/pages/seo/QuizQuestionsWithAnswers'));
const GKQuiz = lazy(() => import('@/pages/seo/GKQuiz'));
const GKQuestions = lazy(() => import('@/pages/seo/GKQuestions'));
const HindiQuiz = lazy(() => import('@/pages/seo/HindiQuiz'));
const EnglishQuiz = lazy(() => import('@/pages/seo/EnglishQuiz'));
const OnlineQuiz = lazy(() => import('@/pages/seo/OnlineQuiz'));
const ScienceQuiz = lazy(() => import('@/pages/seo/ScienceQuiz'));
const CurrentAffairsQuiz = lazy(() => import('@/pages/seo/CurrentAffairsQuiz'));
const MathsQuiz = lazy(() => import('@/pages/seo/MathsQuiz'));
const QuizGame = lazy(() => import('@/pages/seo/QuizGame'));
const QuizCompetition = lazy(() => import('@/pages/seo/QuizCompetition'));
const QuizApp = lazy(() => import('@/pages/seo/QuizApp'));
const QuizForKids = lazy(() => import('@/pages/seo/QuizForKids'));
const IndiaQuiz = lazy(() => import('@/pages/seo/IndiaQuiz'));
const SportsQuizLanding = lazy(() => import('@/pages/seo/SportsQuizLanding'));
const CricketQuiz = lazy(() => import('@/pages/seo/CricketQuiz'));
const GeneralKnowledgeQuiz = lazy(() => import('@/pages/seo/GeneralKnowledgeQuiz'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Footer = lazy(() => import('@/components/Footer'));
const ProfileUpdateModal = lazy(() => import('@/components/ProfileUpdateModal'));

// Reusable group of static public informational routes (as a fragment – not a component – so <Routes> accepts it)
const policyRoutes = (
  <>
    <Route path="/terms-conditions/" element={<TermsConditions />} />
    <Route path="/privacy-policy/" element={<PrivacyPolicy />} />
    <Route path="/about-us/" element={<AboutUs />} />
    <Route path="/contact-us/" element={<ContactUs />} />
    <Route path="/play-win-quiz-app/" element={<PlayWinQuiz />} />
    <Route path="/opinion-quiz-app/" element={<OpinionQuiz />} />
    <Route path="/refer-earn-quiz-app/" element={<ReferEarnInfo />} />
    <Route path="/leaderboards/" element={<Leaderboards />} />
  </>
);

// Public SEO routes (indexable landing pages)
const seoLandingRoutes = (
  <>
    <Route path="/quiz-questions/" element={<QuizQuestions />} />
    <Route path="/quiz-questions-with-answers/" element={<QuizQuestionsWithAnswers />} />
    <Route path="/gk-quiz/" element={<GKQuiz />} />
    <Route path="/gk-questions/" element={<GKQuestions />} />
    <Route path="/hindi-quiz/" element={<HindiQuiz />} />
    <Route path="/english-quiz/" element={<EnglishQuiz />} />
    <Route path="/online-quiz/" element={<OnlineQuiz />} />
    <Route path="/science-quiz/" element={<ScienceQuiz />} />
    <Route path="/current-affairs-quiz/" element={<CurrentAffairsQuiz />} />
    <Route path="/maths-quiz/" element={<MathsQuiz />} />
    <Route path="/quiz-game/" element={<QuizGame />} />
    <Route path="/quiz-competition/" element={<QuizCompetition />} />
    <Route path="/quiz-app/" element={<QuizApp />} />
    <Route path="/quiz-for-kids/" element={<QuizForKids />} />
    <Route path="/india-quiz/" element={<IndiaQuiz />} />
    <Route path="/sports-quiz/" element={<SportsQuizLanding />} />
    <Route path="/cricket-quiz/" element={<CricketQuiz />} />
    <Route path="/general-knowledge-quiz/" element={<GeneralKnowledgeQuiz />} />
  </>
);

const UnconfirmedEmail = () => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-xl text-center">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
        Check your email
      </h2>
      <p className="text-gray-600">
        We&apos;ve sent a confirmation link to your email address. Please click the link to complete
        your registration.
      </p>
    </div>
  </div>
);

const Page = ({ children }) => <div className="page-transition">{children}</div>;
const Fallback = () => (
  <div
    className="min-h-[40vh] flex items-center justify-center"
    role="status"
    aria-live="polite"
    aria-label="Loading content"
  >
    <div
      className="rounded-full h-8 w-8 border-3 border-white/20 border-t-indigo-500"
      style={{ animation: 'spin 0.7s linear infinite' }}
      aria-hidden="true"
    ></div>
  </div>
);

function RouteChangeTracker() {
  const location = useLocation();
  useEffect(() => {
    try {
      const page_path = location.pathname + location.search + location.hash;
      if (window.gtag) window.gtag('event', 'page_view', { page_path });
    } catch (e) {
      /* analytics page_view failed silently */
    }
  }, [location]);
  return null;
}

// Simple focus management hook for route changes
function useRouteFocus() {
  const location = useLocation();
  useEffect(() => {
    const main = document.getElementById('app-main');
    if (main) {
      // Using setTimeout to allow React suspense content to paint first
      setTimeout(() => {
        try {
          main.focus({ preventScroll: false });
        } catch (e) {
          /* ignore focus error */
        }
      }, 0);
    }
  }, [location.pathname]);
}

function InitNotifications() {
  // Initialize Push Notifications only when this component is rendered
  // Removed unused user variable (auth state already handled in parent conditional)
  usePushNotifications();
  return null;
}

function App() {
  const { user: authUser, loading, isRecoveryFlow } = useAuth();
  // We only need focus management once layout is rendered; apply inside Router tree via helper component

  // Remove static loader only when app is fully ready
  useEffect(() => {
    if (!loading) {
      // App is ready, remove static loader with smooth transition
      requestAnimationFrame(() => {
        const staticLoader = document.getElementById('static-loader');
        if (staticLoader) {
          staticLoader.style.opacity = '0';
          setTimeout(() => {
            staticLoader.remove();
          }, 150);
        }
      });
    }
  }, [loading]);

  // While loading, keep static loader visible (don't render anything else)
  if (loading) {
    return null; // Static loader from index.html stays visible
  }

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RouteChangeTracker />
        {/* Global Cyberpunk Background - Same as Home page */}
        <div className="app-bg" aria-hidden="true">
          <div className="app-bg-base" />
          <div className="app-bg-scan" />
          <div className="app-bg-grid" />
          <div className="app-bg-vignette" />
        </div>
        <div
          className="min-h-screen flex flex-col relative text-gray-50 transition-all duration-300 ease-in-out z-10"
          style={{ margin: 0, padding: 0, background: 'transparent' }}
        >
          <Helmet>
            <html lang="en-IN" />
            <title>Quiz Dangal – Play Quizzes & Win | Refer & Earn</title>
            <meta
              name="description"
              content="Play opinion-based quizzes, climb leaderboards, win rewards, and refer friends to earn coins on Quiz Dangal. India's #1 free quiz platform."
            />
            <meta name="author" content="Quiz Dangal" />
            <meta name="creator" content="Quiz Dangal" />
            <meta name="publisher" content="Quiz Dangal" />
            <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
            <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
            <meta name="rating" content="General" />
            <meta name="distribution" content="global" />
            <meta name="revisit-after" content="3 days" />
          </Helmet>
          {/* Initialize notifications for authenticated, confirmed users outside of <Routes> */}
          {authUser &&
            !isRecoveryFlow &&
            !(authUser.app_metadata?.provider === 'email' && !authUser.email_confirmed_at) && (
              <InitNotifications />
            )}
          <Suspense fallback={<Fallback />}>
            <RouteFocusWrapper>
              <Routes>
                {/* If recovery flow is active, always route to reset-password */}
                {isRecoveryFlow ? (
                  <>
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="*" element={<Navigate to="/reset-password" replace />} />
                  </>
                ) : !authUser ? (
                  <>
                    {/* Public pages accessible without login - with Header */}
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/login" element={<Login />} />
                    {/* All other public routes get Header + Footer */}
                    <Route path="/*" element={<PublicLayout />} />
                  </>
                ) : authUser.app_metadata?.provider === 'email' && !authUser.email_confirmed_at ? (
                  <>
                    {/* Public policy pages accessible during unconfirmed email state as well */}
                    {policyRoutes}
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="*" element={<UnconfirmedEmail />} />
                  </>
                ) : (
                  <>
                    <Route path="/quiz/:id" element={<Quiz />} />
                    <Route path="/quiz/slot/:slotId" element={<Quiz />} />
                    {/* Canonicalize category routes (avoid duplicate-content URLs) */}
                    <Route
                      path="/category/:slug/"
                      element={
                        <Page>
                          <CategoryQuizzes />
                        </Page>
                      }
                    />
                    <Route
                      path="/category/:slug"
                      element={<CategoryTrailingSlashRedirect />}
                    />
                    <Route path="/results/:id" element={<Results />} />
                    <Route path="/results/slot/:slotId" element={<Results />} />
                    <Route path="/*" element={<MainLayout />} />
                  </>
                )}
              </Routes>
            </RouteFocusWrapper>
          </Suspense>
          <Toaster />
          <CookieConsent />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

/**
 * AdminRoute - Client-side UI protection ONLY
 * ⚠️ SECURITY NOTE: This is NOT real security! It only hides the UI.
 * Real security is enforced by Supabase RLS (Row Level Security) policies.
 * Anyone with DevTools can bypass this check - that's why backend RLS is critical.
 */
function AdminRoute({ children }) {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }
  const role = String(userProfile?.role || '')
    .trim()
    .toLowerCase();
  // Only check role from server-backed profile.
  // Real security is enforced by Supabase RLS, this is UI-only protection
  const isAdmin = role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="qd-card rounded-2xl max-w-md w-full p-6 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Admin access required</h2>
          <p className="text-sm text-white/70">
            Admin panel kholne ke liye aapke Supabase <code>profiles</code> record ka{' '}
            <strong>role</strong> field <code>&apos;admin&apos;</code> hona zaroori hai.
          </p>
          <ul className="text-left text-sm text-white/65 mt-4 space-y-2 list-disc list-inside">
            <li>
              Supabase dashboard &rarr; Table editor &rarr; <code>profiles</code> me login user ka{' '}
              <code>role</code> update karein.
            </li>
            <li>Changes apply hone ke baad dobara login karein ya session refresh karein.</li>
            <li>
              Agar dev bypass (<code>VITE_BYPASS_AUTH=1</code>) use kar rahe hain to mock admin
              profile already enable hai.
            </li>
          </ul>
        </div>
      </div>
    );
  }
  return children;
}

// Wrapper component to apply focus effect inside Router context
function RouteFocusWrapper({ children }) {
  useRouteFocus();
  return (
    <div
      id="app-focus-wrapper"
      tabIndex="-1"
      className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
    >
      {children}
    </div>
  );
}

// Public layout for non-authenticated users (Header only, no Footer)
const PublicLayout = () => {
  const isHome =
    typeof window !== 'undefined' && window.location && window.location.pathname === '/';
  return (
    <>
      <Header />
      <main
        className={`flex-1 ${isHome ? 'pt-6 sm:pt-8 pb-4' : 'pb-6 pt-4 sm:pt-6'}`}
        id="app-main"
        tabIndex="-1"
        role="main"
        aria-label="Application Content"
      >
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <Page>
                  <Home />
                </Page>
              }
            />
            {seoLandingRoutes}
            {policyRoutes}
            {/* Publicly accessible category pages for SEO */}
            <Route
              path="/category/:slug/"
              element={
                <Page>
                  <CategoryQuizzes />
                </Page>
              }
            />
            <Route
              path="/category/:slug"
              element={<CategoryTrailingSlashRedirect />}
            />

            {/* Known protected routes: redirect to login instead of 404 */}
            <Route path="/quiz/*" element={<LoginRedirect message="Please sign in to play quizzes." />} />
            <Route path="/my-quizzes/*" element={<LoginRedirect message="Please sign in to view your quizzes." />} />
            <Route path="/wallet/*" element={<LoginRedirect message="Please sign in to open Wallet." />} />
            <Route path="/profile/*" element={<LoginRedirect message="Please sign in to open Profile." />} />
            <Route path="/redemptions/*" element={<LoginRedirect message="Please sign in to redeem rewards." />} />
            <Route path="/results/*" element={<LoginRedirect message="Please sign in to view results." />} />
            <Route path="/admin/*" element={<LoginRedirect message="Please sign in to continue." />} />
            {/* For unknown routes show proper 404 page (SEO-friendly) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <PWAInstallButton />
    </>
  );
};

function CategoryTrailingSlashRedirect() {
  const { slug } = useParams();
  const safeSlug = String(slug || '').trim();
  return <Navigate to={safeSlug ? `/category/${safeSlug}/` : '/category/'} replace />;
}

function LoginRedirect({ message }) {
  const location = useLocation();
  const from = location.pathname + location.search + location.hash;
  return <Navigate to="/login" replace state={{ from, message: message || 'Please sign in to continue.' }} />;
}

const MainLayout = () => {
  const { userProfile, loading: authLoading, hasSupabaseConfig } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const requiresProfileCompletion = useMemo(() => {
    // If profile hasn't loaded yet, don't show the modal to avoid flicker
    if (!userProfile) return false;
    const username = (userProfile?.username || '').trim();
    const mobileRaw = ((userProfile?.mobile_number ?? '') + '').trim();
    const usernameOk = /^[a-zA-Z0-9_]{3,}$/.test(username);
    const mobileOk = /^[6-9]\d{9}$/.test(mobileRaw);
    const completionFlag = userProfile?.is_profile_complete === true;
    // Show modal only when truly incomplete: either explicit flag false with missing fields,
    // or brand new user without valid username/mobile yet. If an older user already
    // has both fields valid, do NOT block even if flag was never set previously.
    if (completionFlag) return false;
    if (usernameOk && mobileOk) return false;
    return true;
  }, [userProfile]);

  useEffect(() => {
    if (authLoading) return;
    if (!hasSupabaseConfig) return;
    // Wait until a profile object is available to decide, prevents 1s flicker on initial load
    if (!userProfile) return;
    if (requiresProfileCompletion) {
      setProfileModalOpen(true);
    } else {
      setProfileModalOpen(false);
    }
  }, [authLoading, hasSupabaseConfig, requiresProfileCompletion, userProfile]);

  // Detect if current path is home to tailor layout spacing/overflow (BrowserRouter)
  const isHome =
    typeof window !== 'undefined' && window.location && window.location.pathname === '/';

  return (
    <>
      <Header />
      <main
        className={`flex-1 ${isHome ? 'pt-6 sm:pt-8 pb-24' : 'pb-24 pt-4 sm:pt-6'}`}
        id="app-main"
        tabIndex="-1"
        role="main"
        aria-label="Application Content"
      >
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <Page>
                  <Home />
                </Page>
              }
            />
            {seoLandingRoutes}
            <Route
              path="/my-quizzes/"
              element={
                <Page>
                  <MyQuizzes />
                </Page>
              }
            />
            <Route
              path="/wallet/"
              element={
                <Page>
                  <Wallet />
                </Page>
              }
            />
            <Route
              path="/profile/"
              element={
                <Page>
                  <Profile />
                </Page>
              }
            />
            <Route
              path="/leaderboards/"
              element={
                <Page>
                  <Leaderboards />
                </Page>
              }
            />
            <Route
              path="/refer/"
              element={
                <Page>
                  <ReferEarn />
                </Page>
              }
            />
            <Route path="/rewards" element={<Navigate to="/wallet/" replace />} />
            <Route
              path="/redemptions/"
              element={
                <Page>
                  <Redemptions />
                </Page>
              }
            />
            {/* Reuse informational routes inside authenticated layout as well */}
            <Route
              path="/about-us/"
              element={
                <Page>
                  <AboutUs />
                </Page>
              }
            />
            <Route
              path="/contact-us/"
              element={
                <Page>
                  <ContactUs />
                </Page>
              }
            />
            <Route
              path="/play-win-quiz-app/"
              element={
                <Page>
                  <PlayWinQuiz />
                </Page>
              }
            />
            <Route
              path="/opinion-quiz-app/"
              element={
                <Page>
                  <OpinionQuiz />
                </Page>
              }
            />
            <Route
              path="/refer-earn-quiz-app/"
              element={
                <Page>
                  <ReferEarnInfo />
                </Page>
              }
            />
            <Route
              path="/debug/notifications"
              element={
                <Page>
                  <NotificationsDebug />
                </Page>
              }
            />
            <Route
              path="/terms-conditions/"
              element={
                <Page>
                  <TermsConditions />
                </Page>
              }
            />
            <Route
              path="/privacy-policy/"
              element={
                <Page>
                  <PrivacyPolicy />
                </Page>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Page>
                    <Admin />
                  </Page>
                </AdminRoute>
              }
            />
            <Route path="/admin/users" element={<Navigate to="/admin?tab=users" replace />} />
            <Route
              path="/admin/leaderboards"
              element={<Navigate to="/admin?tab=leaderboards" replace />}
            />
            <Route
              path="/admin/redemptions"
              element={<Navigate to="/admin?tab=redemptions" replace />}
            />
            <Route path="/admin/reports" element={<Navigate to="/admin?tab=reports" replace />} />
            {/* Show proper 404 page for unknown routes (SEO-friendly) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <PWAInstallButton />
      {hasSupabaseConfig && profileModalOpen && (
        <Suspense fallback={null}>
          <ProfileUpdateModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            isFirstTime={requiresProfileCompletion}
          />
        </Suspense>
      )}
      {/* OnboardingFlow removed */}
    </>
  );
};

export default App;
