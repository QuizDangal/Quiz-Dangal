import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { m } from '@/lib/motion-lite';
import { supabase, hasSupabaseConfig } from '@/lib/customSupabaseClient';
import { getSignedAvatarUrls } from '@/lib/avatar';
import { getPrizeDisplay, safeComputeResultsIfDue } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Trophy,
  Users,
  ArrowLeft,
  Share2,
  ListChecks,
  BookOpenCheck,
} from 'lucide-react';
import { normalizeReferralCode, saveReferralCode, loadReferralCode } from '@/lib/referralStorage';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import SEO from '@/components/SEO';

const Results = () => {
  const { id: quizIdParam, slotId: slotIdParam } = useParams();
  const [effectiveQuizId, setEffectiveQuizId] = useState(quizIdParam);
  const slotId = slotIdParam || null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(null);
  const [didRefetchAfterCountdown, setDidRefetchAfterCountdown] = useState(false);
  const [posterBlob, setPosterBlob] = useState(null); // cache composed poster for quick share
  const [participantsCount, setParticipantsCount] = useState(0);
  // Q&A review for non-opinion categories
  const [qaItems, setQaItems] = useState([]); // [{ id, question_text, options: [{id, option_text, is_correct, isSelected}] }]
  const [showQA, setShowQA] = useState(false);
  // no ShareSheet dialog anymore; direct share only

  // Smooth motion variants for entrance animations
  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.97 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.25,
        delay: i * 0.04,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  };

  // Resolve slotId to quizId if needed
  useEffect(() => {
    const resolveQuizId = async () => {
      let cancelled = false;
      if (slotId && !quizIdParam) {
        // Slot route - need to get quiz_id from quiz_slots_view
        try {
          const { data } = await supabase
            .from('quiz_slots_view')
            .select('quiz_id')
            .eq('id', slotId)
            .maybeSingle();
          if (!cancelled && data?.quiz_id) {
            setEffectiveQuizId(data.quiz_id);
          }
        } catch {
          // ignore
        }
      } else {
        setEffectiveQuizId(quizIdParam);
      }
      return () => {
        cancelled = true;
      };
    };
    resolveQuizId();
  }, [slotId, quizIdParam]);

  // Use effectiveQuizId as quizId throughout
  const quizId = effectiveQuizId;

  // Prevent stale async updates when navigating quickly (e.g., slot resolve -> quiz resolve)
  const fetchSeqRef = useRef(0);

  const fetchResults = useCallback(async () => {
    const seq = (fetchSeqRef.current += 1);
    const isStale = () => fetchSeqRef.current !== seq;

    if (!hasSupabaseConfig || !supabase || !quizId) {
      if (!quizId && (slotId || quizIdParam)) return; // Still resolving
      setErrorMessage('Results are unavailable right now.');
      setLoading(false);
      return;
    }
    try {
      if (!isStale()) {
        setErrorMessage('');
      }

      // === ULTRA-FAST: Only fetch quiz + results first ===
      const [quizResult, resultsResult] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', quizId).single(),
        supabase.from('quiz_results').select('leaderboard').eq('quiz_id', quizId).maybeSingle(),
      ]);

      if (quizResult.error) throw quizResult.error;
      const quizData = quizResult.data;
      if (!isStale()) {
        setQuiz(quizData || null);
      }

      let leaderboard = Array.isArray(resultsResult.data?.leaderboard) 
        ? resultsResult.data.leaderboard 
        : [];

      // Set time left for countdown
      if (quizData?.end_time) {
        const endTs = new Date(quizData.end_time).getTime();
        const diff = endTs - Date.now();
        if (!isStale()) {
          setTimeLeftMs(diff > 0 ? diff : 0);
        }
      }

      const normalized = Array.isArray(leaderboard)
        ? leaderboard.map((row, idx) => ({
            ...row,
            rank: row.rank ?? idx + 1,
          }))
        : [];
      if (!isStale()) {
        setResults(normalized);
        setLoading(false); // Show results INSTANTLY!
      }

      // If quiz ended but leaderboard empty, show "finalizing" state until computed/refetched
      try {
        const endTs = quizData?.end_time ? new Date(quizData.end_time).getTime() : null;
        const ended = typeof endTs === 'number' && endTs <= Date.now();
        if (!isStale()) {
          setFinalizing(ended && normalized.length === 0);
        }
      } catch {
        if (!isStale()) setFinalizing(false);
      }

      // Find current user's rank immediately
      const me = normalized.find((p) => (p.user_id || p.userId) === user?.id);
      if (!isStale()) {
        if (me) setUserRank(me);
        else setUserRank(null);
      }

      // === BACKGROUND: Fetch secondary data non-blocking ===
      // Participation check (for Q&A visibility)
      const participationPromise = user?.id
        ? supabase
            .from('quiz_participants')
            .select('id')
            .eq('user_id', user.id)
            .or(slotId ? `slot_id.eq.${slotId},quiz_id.eq.${quizId}` : `quiz_id.eq.${quizId}`)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null });

        // Engagement counts (for participant count display)
        // Slot-based quizzes track participants by slot_id, so read from quiz_slots_view.
        const engagementPromise = (async () => {
          try {
            if (slotId) {
              return await supabase
                .from('quiz_slots_view')
                .select('*')
                .eq('id', slotId)
                .maybeSingle();
            } else {
              return await supabase.rpc('get_engagement_counts', { p_quiz_id: quizId });
            }
          } catch {
            return { data: null };
          }
        })();

      // If no results and quiz ended, trigger compute in background
      if (leaderboard.length === 0 && quizData?.end_time) {
        const endTs = new Date(quizData.end_time).getTime();
        if (endTs <= Date.now()) {
          safeComputeResultsIfDue(supabase, quizId, { throttleMs: 0 })
            .then(async (computed) => {
              if (!computed || isStale()) return;
              const { data: resRow2 } = await supabase
                .from('quiz_results')
                .select('leaderboard')
                .eq('quiz_id', quizId)
                .maybeSingle();
              if (isStale()) return;
              const lb2 = Array.isArray(resRow2?.leaderboard) ? resRow2.leaderboard : [];
              if (lb2.length) {
                setResults(lb2.map((row, idx) => ({ ...row, rank: row.rank ?? idx + 1 })));
                setFinalizing(false);
              }
            })
            .catch(() => {});
        }
      }

      // Process participation and engagement in background
      Promise.all([participationPromise, engagementPromise]).then(([participationResult, engagementResult]) => {
        if (isStale()) return;
        const amParticipant = !!participationResult.data;
        setIsParticipant(amParticipant);

        try {
          const rec = Array.isArray(engagementResult.data) ? engagementResult.data[0] : engagementResult.data;
          if (slotId) {
            const joined = Number(rec?.participants_joined ?? rec?.joined_count ?? rec?.joined ?? 0);
            const pre = Number(rec?.participants_pre ?? rec?.pre_joined_count ?? rec?.pre_joined ?? 0);
            const total = Number(rec?.participants_total ?? (joined + pre));
            setParticipantsCount(Number.isFinite(total) ? total : 0);
          } else {
            const joined = Number(rec?.joined ?? 0);
            const pre = Number(rec?.pre_joined ?? 0);
            setParticipantsCount(joined + pre);
          }
        } catch {
          setParticipantsCount(0);
        }

        // === Q&A and Profile enrichment (background) ===
        const category = (quizData?.category || '').toLowerCase();
        const shouldLoadQA = category !== 'opinion' && (amParticipant || normalized.length);
        const topIds = normalized.slice(0, 10).map((e) => e.user_id).filter(Boolean);

        Promise.all([
          shouldLoadQA
            ? supabase
                .from('questions')
                .select('id, question_text, options ( id, option_text, is_correct )')
                .eq('quiz_id', quizId)
                .order('id')
            : Promise.resolve({ data: [] }),
          topIds.length
            ? supabase.rpc('profiles_public_by_ids', { p_ids: topIds })
            : Promise.resolve({ data: [] }),
        ]).then(async ([qaResult, profilesResult]) => {
          if (isStale()) return;
          // Process Q&A
          try {
            if (shouldLoadQA && Array.isArray(qaResult.data) && qaResult.data.length) {
              let selectionsMap = new Map();
              if (user?.id) {
                const qids = qaResult.data.map((q) => q.id);
                const { data: uans } = await supabase
                  .from('user_answers')
                  .select('question_id, selected_option_id')
                  .in('question_id', qids)
                  .eq('user_id', user.id);
                if (Array.isArray(uans))
                  selectionsMap = new Map(uans.map((r) => [r.question_id, r.selected_option_id]));
              }
              const mapped = qaResult.data.map((q) => ({
                id: q.id,
                question_text: q.question_text,
                options: (q.options || []).map((o) => ({
                  id: o.id,
                  option_text: o.option_text,
                  is_correct: !!o.is_correct,
                  isSelected: selectionsMap.get(q.id) === o.id,
                })),
              }));
              setQaItems(mapped);
            }
          } catch { /* ignore */ }

          // Process profile enrichment
          try {
            if (Array.isArray(profilesResult.data) && profilesResult.data.length) {
              const profileMap = new Map(profilesResult.data.map((p) => [p.id, p]));
              const signedMap = await getSignedAvatarUrls(
                profilesResult.data.map((p) => p.avatar_url).filter(Boolean),
              );
              if (!isStale()) {
                setResults((prev) =>
                  prev.map((item) => {
                    const p = profileMap.get(item.user_id);
                    if (!p) return item;
                    const signedUrl = p.avatar_url ? signedMap.get(p.avatar_url) || '' : '';
                    return {
                      ...item,
                      profiles: {
                        username: p.username,
                        full_name: p.full_name,
                        avatar_url: signedUrl,
                      },
                    };
                  }),
                );
              }
            }
          } catch { /* ignore */ }
        }).catch(() => {});
      }).catch(() => {});
    } catch (error) {
      console.error('Error fetching results:', error);
      setFinalizing(false);
      setErrorMessage(error?.message || 'Failed to load results.');
      setLoading(false);
    }
  }, [quizId, quizIdParam, slotId, user?.id]);

  useEffect(() => {
    if (quizId) fetchResults();
  }, [fetchResults, quizId]);

  const handleRetry = () => {
    setLoading(true);
    setErrorMessage('');
    fetchResults();
  };
  // Prize related derived values (needed before poster effect dependencies)
  const prizeType = quiz?.prize_type || 'coins';
  const userPrizeVal =
    userRank?.rank && Array.isArray(quiz?.prizes) && quiz.prizes[userRank.rank - 1]
      ? quiz.prizes[userRank.rank - 1]
      : 0;
  const userPrizeDisplay = getPrizeDisplay(prizeType, userPrizeVal, { fallback: 0 });
  // Prepare poster in the background once results are available
  useEffect(() => {
    let cancelled = false;
    const prep = async () => {
      try {
        if (results.length === 0) {
          setPosterBlob(null);
          return;
        }
        const blob = await generateComposedResultsPoster();
        if (!cancelled) setPosterBlob(blob);
      } catch {
        if (!cancelled) setPosterBlob(null);
      }
    };
    prep();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    results.length,
    quizId,
    userRank?.rank,
    userRank?.score,
    userProfile?.full_name,
    userProfile?.username,
    user?.id,
    userProfile?.referral_code,
    userPrizeVal,
  ]);

  // Removed static background poster; we render a clean gradient background only.

  // As soon as user has a prize decided, refresh profile so wallet updates without manual refresh
  useEffect(() => {
    try {
      if (!user?.id) return;
      if (!Array.isArray(quiz?.prizes)) return;
      if (!userRank?.rank) return;
      const prizeVal = quiz.prizes[userRank.rank - 1] || 0;
      if (prizeVal > 0) {
        // Fire-and-forget; AuthContext will update userProfile state
        refreshUserProfile(user);
      }
    } catch {
      /* ignore */
    }
  }, [user, userRank?.rank, quiz?.prizes, refreshUserProfile]);

  // Compose a dynamic Results poster (portrait-only) with strict flow and QR footer (memoized)
  const generateComposedResultsPoster = useCallback(async () => {
    try {
      const W = 1080,
        H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      const fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto';
      const setFont = (weight, sizePx) => {
        ctx.font = `${weight} ${sizePx}px ${fontFamily}`;
      };
      const measureW = (t) => ctx.measureText(t).width;
      const fitFontSize = (text, maxW, weight, start, min) => {
        let s = start;
        setFont(weight, s);
        while (s > min && measureW(text) > maxW) {
          s -= 2;
          setFont(weight, s);
        }
        return s;
      };
      const wrapText = (text, maxW, weight, size) => {
        setFont(weight, size);
        const words = String(text).split(/\s+/);
        const lines = [];
        let cur = '';
        for (const w of words) {
          const trial = cur ? cur + ' ' + w : w;
          if (measureW(trial) <= maxW) cur = trial;
          else {
            if (cur) lines.push(cur);
            cur = w;
          }
        }
        if (cur) lines.push(cur);
        return lines;
      };
      const drawCenteredWrapped = (
        text,
        xCenter,
        yStart,
        maxW,
        weight,
        start,
        min,
        maxLines,
        color,
      ) => {
        let size = start;
        let lines = wrapText(text, maxW, weight, size);
        while ((lines.length > maxLines || lines.some((l) => measureW(l) > maxW)) && size > min) {
          size -= 1;
          lines = wrapText(text, maxW, weight, size);
        }
        setFont(weight, size);
        ctx.fillStyle = color;
        const lh = Math.round(size * 1.25);
        const used = Math.min(maxLines, lines.length);
        for (let i = 0; i < used; i++) {
          const line = lines[i];
          const lw = measureW(line);
          ctx.fillText(line, xCenter - lw / 2, yStart + i * lh);
        }
        return { height: used * lh, size };
      };
      const trimToWidth = (text, maxW) => {
        let s = String(text);
        while (s && measureW(s) > maxW) s = s.slice(0, -1);
        return s.length < String(text).length ? s.slice(0, Math.max(0, s.length - 1)) + '…' : s;
      };
      const loadImage = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // Background gradient
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#150a36');
      g.addColorStop(1, '#0f0926');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const PAD = 64,
        cxMid = W / 2;
      let y = PAD + 12;
      // Big top logo in gradient circle
      const badgeR = 140,
        badgeCY = y + badgeR;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cxMid, badgeCY, badgeR, 0, Math.PI * 2);
      ctx.closePath();
      const bg1 = ctx.createLinearGradient(
        cxMid - badgeR,
        badgeCY - badgeR,
        cxMid + badgeR,
        badgeCY + badgeR,
      );
      bg1.addColorStop(0, '#1cc5ff');
      bg1.addColorStop(1, '#ef47ff');
      ctx.fillStyle = bg1;
      ctx.fill();
      try {
        const posterLogoSetting = (import.meta.env.VITE_POSTER_LOGO_URL || '').trim();
        const posterLogo = posterLogoSetting || '/android-chrome-192x192.png';
        let logo;
        try {
          logo = await loadImage(posterLogo);
        } catch (e) {
          logo = await loadImage('/android-chrome-192x192.png');
        }
        const inset = 16;
        const d = badgeR * 2 - inset;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cxMid, badgeCY, badgeR - inset / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          logo,
          Math.round(cxMid - d / 2),
          Math.round(badgeCY - d / 2),
          Math.round(d),
          Math.round(d),
        );
        ctx.restore();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(cxMid, badgeCY, badgeR - inset / 2, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {
        /* badge logo draw fail */
      }
      ctx.restore();
      y = badgeCY + badgeR + 18;

      // Header + subtitle
      const name = (userProfile?.full_name || userProfile?.username || 'Your')
        .toString()
        .toUpperCase();
      const headerText = `🏅 ${name}\u2019S LEGENDARY RUN 🏅`;
      const h1 = drawCenteredWrapped(
        headerText,
        cxMid,
        y,
        W - PAD * 2,
        '900',
        56,
        34,
        2,
        '#ffd54a',
      );
      y += h1.height + 16;
      const sub = drawCenteredWrapped(
        '✨ Brains = Fame ✨',
        cxMid,
        y,
        W - PAD * 2,
        '700',
        36,
        22,
        1,
        'rgba(255,255,255,0.9)',
      );
      y += sub.height + 28;

      // Results box
      const boxX = PAD,
        boxW = W - PAD * 2,
        lineLeft = boxX + 56;
      const boxTopPad = 48,
        boxBotPad = 40;
      const rankText = userRank?.rank ? `#${userRank.rank} Rank!` : 'Results Live!';
      const prizeDisplay = getPrizeDisplay(prizeType, userPrizeVal, { fallback: 0 });
      const prizeText = `👑 Prize: ${prizeDisplay.formatted}`;
      const scoreText = typeof userRank?.score === 'number' ? `☑️ Score: ${userRank.score}` : '';
      const rankSize = fitFontSize(rankText, boxW - 100, '900', 112, 80);
      const prizeSize = fitFontSize(prizeText, boxW - 100, '900', 48, 32);
      const scoreSize = scoreText ? fitFontSize(scoreText, boxW - 100, '900', 44, 28) : 0;
      const innerH =
        Math.round(rankSize * 1.0) +
        24 +
        Math.round(prizeSize * 1.15) +
        12 +
        (scoreText ? Math.round(scoreSize * 1.15) + 12 : 0);
      const boxH = boxTopPad + innerH + boxBotPad;
      const boxY = y;
      const gradStroke = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
      gradStroke.addColorStop(0, 'rgba(34,211,238,0.9)');
      gradStroke.addColorStop(1, 'rgba(236,72,153,0.9)');
      ctx.save();
      roundRect(boxX, boxY, boxW, boxH, 36);
      ctx.fillStyle = 'rgba(15,23,42,0.72)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = gradStroke;
      ctx.stroke();
      ctx.restore();
      let ry = boxY + boxTopPad;
      setFont('900', rankSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(rankText, lineLeft, ry);
      ry += Math.round(rankSize * 1.0) + 24;
      setFont('900', prizeSize);
      ctx.fillStyle = '#ffd54a';
      ctx.fillText(prizeText, lineLeft, ry);
      ry += Math.round(prizeSize * 1.15) + 12;
      if (scoreText) {
        setFont('900', scoreSize);
        ctx.fillStyle = 'rgba(168,255,230,0.95)';
        ctx.fillText(scoreText, lineLeft, ry);
        ry += Math.round(scoreSize * 1.15) + 12;
      }
      y = boxY + boxH + 28;

      // CTA area with reserved footer space
      const footerMin = 230;
      const availForCta = Math.max(120, H - PAD - footerMin - y);
      const ctaMain = '⚡ My Result is Live!';
      const ctaSize = fitFontSize(ctaMain, boxW - 120, '900', 48, 26);
      const quote = '“Think you can beat me? Join Quiz Dangal & prove it 👀”';
      const quoteSize = 26;
      const quoteLH = Math.round(quoteSize * 1.25);
      setFont('700', quoteSize);
      const quoteLines = wrapText(quote, boxW - 120, '700', quoteSize).slice(0, 2);
      const quoteH = quoteLines.length * quoteLH;
      let ctaH = 28 + Math.round(ctaSize) + 12 + quoteH + 28;
      if (ctaH > availForCta) ctaH = availForCta;
      const ctaY = y;
      roundRect(boxX, ctaY, boxW, ctaH, 28);
      ctx.fillStyle = 'rgba(8,11,30,0.9)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(56,189,248,0.5)';
      ctx.stroke();
      setFont('900', ctaSize);
      ctx.fillStyle = '#facc15';
      const ctw = measureW(ctaMain);
      ctx.fillText(ctaMain, cxMid - ctw / 2, ctaY + 28);
      setFont('700', quoteSize);
      ctx.fillStyle = 'rgba(226,232,240,0.92)';
      let qy = ctaY + 28 + Math.round(ctaSize) + 12;
      for (const l of quoteLines) {
        const lw = measureW(l);
        ctx.fillText(l, cxMid - lw / 2, qy);
        qy += quoteLH;
      }
      y = ctaY + ctaH + 24;

      // Footer with QR
      const footerY = y;
      const footerH = Math.max(footerMin, Math.min(280, H - PAD - footerY));
      roundRect(boxX, footerY, boxW, footerH, 24);
      ctx.fillStyle = 'rgba(12,10,36,0.9)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(79,70,229,0.45)';
      ctx.stroke();
      const fallbackRef = (() => {
        if (userProfile?.referral_code) return userProfile.referral_code;
        if (user?.id) return user.id.replace(/-/g, '').slice(0, 8).toUpperCase();
        return '';
      })();
      const refCode = normalizeReferralCode(fallbackRef);
      const siteBase = (
        import.meta.env.VITE_PUBLIC_SITE_URL || 'https://www.quizdangal.com'
      ).replace(/\/$/, '');
      const referralUrl = `${siteBase}/?ref=${encodeURIComponent(refCode)}`;
      if (refCode) {
        try {
          const existing = loadReferralCode();
          if (!existing || existing !== refCode) {
            saveReferralCode(refCode);
          }
        } catch {
          /* ignore */
        }
      }
      const qrSize = Math.min(220, footerH - 72);
      const cardW = qrSize + 32;
      const cardH = qrSize + 40;
      const cardX = boxX + boxW - cardW - 36;
      const cardY = footerY + Math.max(24, Math.round((footerH - cardH) / 2));
      roundRect(cardX, cardY, cardW, cardH, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      try {
        const { default: QRCode } = await import('qrcode');
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, referralUrl, {
          width: qrSize,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        ctx.drawImage(qrCanvas, cardX + 16, cardY + 16, qrSize, qrSize);
      } catch {
        /* QR generation failed: leave blank */
      }
      const leftX = boxX + 36;
      const maxLeft = cardX - 24 - leftX;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      setFont('900', 48);
      ctx.fillText(trimToWidth('🧠 Play & Win', maxLeft), leftX, footerY + 36);
      ctx.fillStyle = 'rgba(203,213,225,0.98)';
      setFont('800', 36);
      ctx.fillText(trimToWidth('🌐 www.quizdangal.com', maxLeft), leftX, footerY + 36 + 54);
      setFont('900', 44);
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      const lbl = '🔗 Referral: ';
      const lblW = measureW(lbl);
      ctx.fillText(trimToWidth(lbl, maxLeft), leftX, footerY + 36 + 54 + 62);
      ctx.fillStyle = 'rgba(0,255,198,1)';
      ctx.fillText(
        trimToWidth(refCode, Math.max(0, maxLeft - lblW - 8)),
        leftX + lblW,
        footerY + 36 + 54 + 62,
      );
      setFont('700', 26);
      ctx.fillStyle = 'rgba(226,232,240,0.92)';
      ctx.fillText(
        trimToWidth('Your turn to flex your brain 💯', maxLeft),
        leftX,
        footerY + footerH - 80,
      );
      setFont('700', 24);
      ctx.fillStyle = 'rgba(203,213,225,0.92)';
      ctx.fillText(
        trimToWidth('#QuizDangal  #ChallengeAccepted  #PlayToWin', maxLeft),
        leftX,
        footerY + footerH - 44,
      );

      const out = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
      return out;
    } catch {
      try {
        const c = document.createElement('canvas');
        c.width = 8;
        c.height = 8;
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 8, 8);
        g.addColorStop(0, '#130531');
        g.addColorStop(1, '#1e0b4b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 8, 8);
        const jpg = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
        return jpg;
      } catch {
        return null;
      }
    }
  }, [
    user?.id,
    userProfile?.full_name,
    userProfile?.username,
    userProfile?.referral_code,
    userRank?.rank,
    userRank?.score,
    prizeType,
    userPrizeVal,
  ]);

  // Live countdown updater when results aren't available yet
  useEffect(() => {
    if (!quiz?.end_time || results.length > 0) {
      setTimeLeftMs(null);
      return;
    }

    const target = new Date(quiz.end_time).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff > 0) {
        setTimeLeftMs(diff);
      } else {
        setTimeLeftMs(0);
        // One-time refetch once countdown completes
        if (!didRefetchAfterCountdown) {
          setDidRefetchAfterCountdown(true);
          fetchResults();
        }
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [quiz?.end_time, results.length, didRefetchAfterCountdown, fetchResults]);

  // Realtime subscription via hook (only while leaderboard empty)
  const realtimeEnabled = (() => {
    try {
      const runtimeEnv =
        typeof window !== 'undefined' && window.__QUIZ_DANGAL_ENV__
          ? window.__QUIZ_DANGAL_ENV__
          : {};
      const raw = import.meta.env.VITE_ENABLE_REALTIME ?? runtimeEnv.VITE_ENABLE_REALTIME ?? '1';
      const v = String(raw).toLowerCase();
      return v === '1' || v === 'true' || v === 'yes';
    } catch {
      return false;
    }
  })();
  const canUseRealtime = (() => {
    try {
      if (!realtimeEnabled) return false;
      if (!hasSupabaseConfig || !supabase || !quizId) return false;
      if (typeof window === 'undefined') return false;
      if (!('WebSocket' in window)) return false;
      if (navigator && navigator.onLine === false) return false;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
      if (typeof window !== 'undefined' && window.isSecureContext === false) return false;
      const conn =
        (navigator &&
          (navigator.connection || navigator.mozConnection || navigator.webkitConnection)) ||
        null;
      if (conn) {
        if (conn.saveData) return false;
        if (typeof conn.effectiveType === 'string' && /(^|\b)2g(\b|$)/i.test(conn.effectiveType))
          return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  useRealtimeChannel({
    enabled: results.length === 0 && canUseRealtime,
    channelName: `quiz-results-${quizId}`,
    table: 'quiz_results',
    filter: `quiz_id=eq.${quizId}`,
    onChange: fetchResults,
    joinTimeoutMs: 5000,
  });

  // Build share text and URL (with referral)
  // buildSharePayload removed (poster-only sharing flow now)

  // Direct device share with poster only (no text)
  const shareResultDirect = async () => {
    try {
      let blob = posterBlob;
      if (!blob) blob = await generateComposedResultsPoster();
      if (blob && navigator.canShare && window.File) {
        const file = new File([blob], 'quiz-dangal-result.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Quiz Dangal Result' });
          toast({ title: 'Shared!', description: 'Poster shared from your device.' });
          return;
        }
      }
      // Fallback: download poster so user can share manually
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz-dangal-result.jpg';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast({ title: 'Poster saved', description: 'Share the image from your gallery.' });
        return;
      }
      toast({ title: 'Share unavailable', description: 'Try again after poster is ready.' });
    } catch (e) {
      toast({
        title: 'Share failed',
        description: e?.message || 'Try again',
        variant: 'destructive',
      });
    }
  };

  // WhatsApp share: poster image only
  const shareToWhatsApp = async () => {
    try {
      let blob = posterBlob;
      if (!blob) blob = await generateComposedResultsPoster();
      // Try to share file via Web Share so user can pick WhatsApp with just the image
      if (blob && navigator.canShare && window.File) {
        const file = new File([blob], 'quiz-dangal-result.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Quiz Dangal Result' });
          return;
        }
      }

      // Fallback: save image and open WhatsApp app without text; user attaches from gallery
      if (blob) {
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'quiz-dangal-result.jpg';
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1500);
        } catch {
          // Silent fallback: if download fails we still proceed to open WhatsApp
        }
      }
      const ua = navigator.userAgent || '';
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      const waDeep = `whatsapp://send`;
      const intentUrl = `intent://send#Intent;scheme=whatsapp;package=com.whatsapp;end`;
      const waWeb = `https://wa.me/`;
      const openNew = (url) => {
        const w = window.open(url, '_blank');
        return !!w;
      };
      if (isAndroid) {
        if (openNew(waDeep)) return;
        window.location.href = intentUrl;
        setTimeout(() => {
          if (!document.hidden) window.location.href = waWeb;
        }, 700);
        return;
      }
      if (isIOS) {
        window.location.href = waDeep;
        setTimeout(() => {
          if (!document.hidden) window.location.href = waWeb;
        }, 700);
        return;
      }
      openNew(waWeb);
    } catch (e) {
      toast({
        title: 'WhatsApp share failed',
        description: e?.message || 'Try again',
        variant: 'destructive',
      });
    }
  };

  // Note: We now use a single clean gradient background for the dynamic poster (no secondary poster behind).

  if (loading) {
    return (
      <div className="min-h-screen px-3 pt-16 sm:pt-20 pb-24">
        <SEO
          title="Results – Loading | Quiz Dangal"
          description="Loading quiz results."
          canonical={
            typeof window !== 'undefined'
              ? `${window.location.origin}/results/${quizId}`
              : 'https://quizdangal.com/results'
          }
          robots="noindex, nofollow"
        />
        <div className="max-w-md mx-auto space-y-3">
          {/* Skeleton Header */}
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-slate-700/60 via-slate-600/50 to-slate-700/60 animate-pulse">
            <div className="rounded-xl bg-slate-900/95 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="h-5 w-24 bg-slate-700 rounded mb-2"></div>
                  <div className="h-3 w-40 bg-slate-800 rounded"></div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-slate-700"></div>
              </div>
            </div>
          </div>
          {/* Skeleton User Card */}
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-slate-700/50 via-slate-600/40 to-slate-700/50 animate-pulse">
            <div className="rounded-xl bg-slate-900/95 p-3">
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800 rounded-lg"></div>)}
              </div>
            </div>
          </div>
          {/* Skeleton Leaderboard */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 animate-pulse">
            <div className="h-4 w-24 bg-slate-700 rounded mb-3"></div>
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                  <div className="w-7 h-7 rounded-md bg-slate-700"></div>
                  <div className="w-6 h-6 rounded-full bg-slate-700"></div>
                  <div className="flex-1 h-3 bg-slate-700 rounded"></div>
                  <div className="w-10 h-3 bg-slate-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && errorMessage) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <SEO
          title="Results – Error | Quiz Dangal"
          description={errorMessage || 'Could not load results.'}
          canonical={
            typeof window !== 'undefined'
              ? `${window.location.origin}/results/${quizId}`
              : 'https://quizdangal.com/results'
          }
          robots="noindex, nofollow"
        />
        <div className="qd-card rounded-2xl p-6 shadow-lg text-center max-w-md w-full text-slate-100">
          <h2 className="text-2xl font-bold mb-2 text-white">Couldn&apos;t load results</h2>
          <p className="text-slate-300 mb-4">{errorMessage}</p>
          <div className="flex justify-center gap-3">
            <Button variant="brand" onClick={handleRetry}>
              Retry
            </Button>
            <Button variant="white" onClick={() => navigate('/my-quizzes/')}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Results not published yet - show timer with back to home button
  if (!loading && (timeLeftMs ?? 0) > 0 && results.length === 0) {
    const formatTimeParts = (ms) => {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return { days, hours, minutes, seconds };
    };
    const { days, hours, minutes, seconds } = formatTimeParts(timeLeftMs);
    const part = (val, label) => (
      <div className="px-3 py-2 rounded-md bg-slate-800/70 border border-slate-700 min-w-[64px]">
        <div className="text-xl font-bold text-white tabular-nums">
          {val.toString().padStart(2, '0')}
        </div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    );
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <SEO
          title="Results – Not Published | Quiz Dangal"
          description="Results will be available after the quiz ends."
          robots="noindex, nofollow"
        />
        <div className="qd-card rounded-2xl p-6 shadow-lg text-center max-w-md w-full text-slate-100">
          <h2 className="text-xl font-bold mb-2 text-white">Results will be published soon.</h2>
          <p className="text-slate-300 mb-4">Quiz ends in</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            {days > 0 && part(days, 'Days')}
            {part(hours, 'Hours')}
            {part(minutes, 'Minutes')}
            {part(seconds, 'Seconds')}
          </div>
          {quiz?.end_time && (
            <p className="text-xs text-slate-400 mb-4">
              Expected publish time: {new Date(quiz.end_time).toLocaleString()}
            </p>
          )}
          <Button
            variant="brand"
            className="w-full"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Quiz ended but leaderboard still empty: keep UX stable (no blank/flicker)
  if (!loading && (timeLeftMs ?? 0) === 0 && results.length === 0 && (finalizing || quiz?.end_time)) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <SEO
          title="Results – Finalizing | Quiz Dangal"
          description="Finalizing quiz results."
          robots="noindex, nofollow"
        />
        <div className="qd-card rounded-2xl p-6 shadow-lg text-center max-w-md w-full text-slate-100">
          <h2 className="text-xl font-bold mb-2 text-white">Finalizing results…</h2>
          <p className="text-slate-300 mb-4">
            {finalizing ? 'Please wait a moment.' : 'Results are being prepared.'}
          </p>
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-b"></div>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="brand" onClick={handleRetry}>
              Refresh
            </Button>
            <Button variant="white" onClick={() => navigate('/my-quizzes/')}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-3 pt-16 sm:pt-20 pb-24 relative"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
    >
      <SEO
        title={`${quiz?.title ? `${quiz.title} – Results` : 'Quiz Results'} | Quiz Dangal`}
        description={
          results.length > 0 ? 'Leaderboard and winners for this quiz.' : 'Results are finalized.'
        }
        canonical={
          typeof window !== 'undefined'
            ? `${window.location.origin}/results/${quizId}`
            : 'https://quizdangal.com/results'
        }
        robots="noindex, nofollow"
      />
      <style>{`.results-prize-row::-webkit-scrollbar{display:none;}`}</style>
      <div className="max-w-md mx-auto space-y-3">
        {/* Compact Results Header */}
        <div className="p-[1px] rounded-xl bg-gradient-to-r from-amber-500/60 via-fuchsia-500/50 to-indigo-500/60">
          <div className="rounded-xl bg-slate-900/95 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h1 className="text-lg font-bold text-white">Results</h1>
                </div>
                <p className="text-xs text-slate-400 truncate">{quiz?.title}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                  <Users className="w-3 h-3" />
                  <span>{participantsCount || results?.length || 0} participants</span>
                </div>
              </div>
              {userRank?.rank && (
                <div className="shrink-0 text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg">
                    <span className="text-lg font-extrabold text-white">#{userRank.rank}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">Your Rank</p>
                </div>
              )}
            </div>
            {/* Prize chips row */}
            {Array.isArray(quiz?.prizes) && quiz.prizes.length > 0 && (
              <div className="results-prize-row mt-2 flex items-center gap-1.5 flex-nowrap overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]">
                {quiz.prizes.slice(0, 5).map((amount, idx) => {
                  const prizeDisplay = getPrizeDisplay(prizeType, amount, { fallback: 0 });
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[10px] font-medium text-slate-300 whitespace-nowrap">
                      <span>{medal}</span>
                      <span>{prizeDisplay.formatted}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* User Summary Card - show for all participants (including admins who played) */}
        {user && (userRank || isParticipant) && (
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-emerald-500/50 via-cyan-500/40 to-indigo-500/50">
            <div className="rounded-xl bg-slate-900/95 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-xs font-semibold text-white">{userRank ? 'Your Result' : 'You Participated'}</div>
                  {userRank && <span className="text-[10px] text-slate-400">of {results.length}</span>}
                </div>
                {(qaItems?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowQA((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${showQA ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                    aria-expanded={showQA}
                  >
                    <BookOpenCheck className="w-3 h-3" />
                    Q&A
                  </button>
                )}
              </div>
              {userRank ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 mb-0.5">Rank</p>
                    <p className="text-base font-bold text-amber-400">#{userRank.rank}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 mb-0.5">Score</p>
                    <p className="text-base font-bold text-emerald-400">{userRank.score}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 mb-0.5">Prize</p>
                    <p className="text-base font-bold text-purple-400">{userPrizeDisplay.formatted}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 mt-2">Review your answers using the Q&A button above.</p>
              )}
            </div>
          </div>
        )}

        {/* Q&A Section */}
        {showQA && (qaItems?.length || 0) > 0 && (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                Questions & Answers
              </div>
              <button
                type="button"
                onClick={() => setShowQA(false)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {qaItems.map((q, idx) => (
                <div key={q.id} className="rounded-lg bg-slate-800/50 border border-slate-700/40 p-2.5">
                  <div className="text-[11px] font-medium text-white mb-1.5">
                    <span className="text-slate-500 mr-1">Q{idx + 1}.</span>
                    {q.question_text}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((o) => {
                      const isCorrect = !!o.is_correct;
                      const isSelected = !!o.isSelected;
                      const palette = isCorrect
                        ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-300'
                        : isSelected
                          ? 'bg-rose-600/15 border-rose-500/30 text-rose-300'
                          : 'bg-slate-900/40 border-slate-700/30 text-slate-400';
                      return (
                        <div key={o.id} className={`px-2 py-1.5 rounded-md border text-[10px] ${palette}`}>
                          <div className="flex items-center gap-1">
                            {isCorrect && <span>✓</span>}
                            {isSelected && !isCorrect && <span>✗</span>}
                            <span className="truncate">{o.option_text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
          <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Leaderboard
          </div>
          <div className="space-y-1.5">
            {results.length === 0 && (
              <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-slate-400 text-[11px]">
                No participants or no valid answers. Results are finalized.
              </div>
            )}
            {results.map((participant, index) => {
              const prizeVal =
                participant.rank && Array.isArray(quiz?.prizes) && quiz.prizes[participant.rank - 1]
                  ? quiz.prizes[participant.rank - 1]
                  : 0;
              const prizeDisplay = getPrizeDisplay(prizeType, prizeVal, { fallback: 0 });
              const isMe = participant.user_id === user?.id;
              const isTop3 = index < 3;
              const rankMedal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
              return (
                <m.div
                  key={`${participant.id}-${index}`}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors duration-200 ${isMe ? 'bg-indigo-950/40 border-indigo-600/40' : isTop3 ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-800/30 border-slate-700/30'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold ${isTop3 ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                      {rankMedal || `#${participant.rank || index + 1}`}
                    </div>
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center text-slate-300 text-[10px] font-bold">
                      {participant.profiles?.avatar_url ? (
                        <img
                          src={participant.profiles.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span>
                          {(participant.profiles?.full_name || participant.profiles?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-white truncate max-w-[100px]">
                      {participant.profiles?.username || participant.profiles?.full_name || 'Anonymous'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-emerald-400">{participant.score}</p>
                    </div>
                    <div className="text-right min-w-[50px]">
                      <p className="text-[11px] font-bold text-purple-400">{prizeDisplay.formatted}</p>
                    </div>
                  </div>
                </m.div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Bottom Action Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        <div
          className="max-w-md mx-auto px-3"
          style={{ paddingTop: 8, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/my-quizzes/')}
              className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[11px] font-semibold bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={shareToWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-green-600 to-emerald-500 border border-green-500/50 hover:opacity-90 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.149-.198.297-.768.966-.941 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.205-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.521.074-.793.372s-1.042 1.016-1.042 2.479 1.067 2.876 1.219 3.074c.149.198 2.1 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.007-1.41.248-.694.248-1.289.173-1.41-.074-.123-.272-.198-.57-.347m-5.49 7.485h-.004a9.867 9.867 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.861 9.861 0 01-1.51-5.241c.001-5.45 4.434-9.884 9.885-9.884 2.641 0 5.122 1.03 6.988 2.897a9.825 9.825 0 012.897 6.994c-.003 5.45-4.436 9.884-9.887 9.884m8.413-18.297A11.815 11.815 0 0012.004 0C5.375 0 .16 5.215.157 11.844a11.82 11.82 0 001.624 5.99L0 24l6.305-1.654a11.86 11.86 0 005.68 1.448h.005c6.628 0 11.843-5.215 11.846-11.844a11.787 11.787 0 00-3.473-8.372z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={shareResultDirect}
              className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 border border-violet-500/50 hover:opacity-90 transition"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
