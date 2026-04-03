/**
 * useBattleSubmission — Hook for PvP battle workout submission via Cloud Function.
 * Handles submission, real-time opponent tracking, and battle result listening.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useBattleSubmission(battleId, userId) {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [opponentSubmitted, setOpponentSubmitted] = useState(false);
    const [battleResult, setBattleResult] = useState(null);
    const [submissionResult, setSubmissionResult] = useState(null);
    const [error, setError] = useState(null);
    const unsubBattleRef = useRef(null);
    const unsubOpponentRef = useRef(null);

    // Listen to battle document for status changes (completed, under_review)
    useEffect(() => {
        if (!battleId) return;
        const battleRef = doc(db, 'battles', battleId);
        unsubBattleRef.current = onSnapshot(battleRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (data.status === 'completed' || data.status === 'under_review') {
                setBattleResult({
                    status: data.status,
                    winnerId: data.winnerId,
                    challengerScore: data.challengerScore,
                    opponentScore: data.opponentScore,
                    challengerXp: data.challengerXpAwarded,
                    opponentXp: data.opponentXpAwarded,
                    challengerEloDelta: data.challengerEloDelta,
                    opponentEloDelta: data.opponentEloDelta,
                });
            }
        });
        return () => { if (unsubBattleRef.current) unsubBattleRef.current(); };
    }, [battleId]);

    // Listen for opponent's submission
    const listenForOpponent = useCallback((opponentId) => {
        if (!battleId || !opponentId) return;
        const subRef = doc(db, 'battles', battleId, 'submissions', opponentId);
        unsubOpponentRef.current = onSnapshot(subRef, (snap) => {
            if (snap.exists()) setOpponentSubmitted(true);
        });
        return () => { if (unsubOpponentRef.current) unsubOpponentRef.current(); };
    }, [battleId]);

    // Submit workout to Cloud Function
    const submitWorkout = useCallback(async ({ exercise, reps, formScore, durationSeconds }) => {
        if (!battleId || submitting || submitted) return;
        setSubmitting(true);
        setError(null);

        try {
            const functions = getFunctions();
            const submitBattleWorkout = httpsCallable(functions, 'submitBattleWorkout');
            const result = await submitBattleWorkout({
                battleId,
                exercise,
                reps: Math.round(reps),
                formScore: Math.round(formScore),
                durationSeconds: Math.round(durationSeconds),
            });
            setSubmitted(true);
            setSubmissionResult(result.data);
            return result.data;
        } catch (err) {
            const msg = err?.message || 'Submission failed';
            if (msg.includes('Anti-cheat')) setError('Workout flagged — check your data.');
            else if (msg.includes('already submitted')) setError('Already submitted for this battle.');
            else if (msg.includes('not a participant')) setError('You are not in this battle.');
            else setError(msg.length > 100 ? 'Submission failed. Try again.' : msg);
            return null;
        } finally {
            setSubmitting(false);
        }
    }, [battleId, submitting, submitted]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (unsubBattleRef.current) unsubBattleRef.current();
            if (unsubOpponentRef.current) unsubOpponentRef.current();
        };
    }, []);

    return {
        submitWorkout,
        listenForOpponent,
        submitting,
        submitted,
        opponentSubmitted,
        battleResult,
        submissionResult,
        error,
    };
}
