import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Copy, Trash2, Shield, Terminal, Eye, EyeOff, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { GlassCard } from './UIComponents';

const READ_SCOPES = [
  'workouts:read',
  'nutrition:read',
  'progress:read',
  'profile:read',
  'leaderboard:read',
  'guild:read',
  'battles:read',
];

const WRITE_SCOPES = [
  'workouts:write',
  'nutrition:write',
  'battles:create',
];

const scopeColor = (scope) =>
  scope.includes('read')
    ? { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', border: 'rgba(34,197,94,0.3)' }
    : { bg: 'rgba(251,146,60,0.15)', text: '#fb923c', border: 'rgba(251,146,60,0.3)' };

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * ApiKeyManager
 *
 * Full-screen overlay for managing Open API keys for AI agents.
 *
 * Props:
 *   user     - Firebase Auth user object
 *   profile  - user profile doc from Firestore
 *   onClose  - callback to dismiss
 */
export const ApiKeyManager = ({ user, profile, onClose }) => {
  // --- State ---
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState(null); // full key shown once
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(null); // key id being revoked
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [showDocs, setShowDocs] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch keys on mount ---
  useEffect(() => {
    let cancelled = false;
    const fetchKeys = async () => {
      try {
        setLoading(true);
        const functions = getFunctions();
        const listApiKeys = httpsCallable(functions, 'listApiKeys');
        const result = await listApiKeys();
        if (!cancelled && result?.data?.keys) {
          setKeys(result.data.keys);
        }
      } catch (err) {
        console.error('Failed to list API keys:', err);
        if (!cancelled) setError('Failed to load API keys.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchKeys();
    return () => { cancelled = true; };
  }, []);

  // --- Toggle scope ---
  const toggleScope = useCallback((scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }, []);

  // --- Generate key ---
  const handleGenerate = useCallback(async () => {
    if (!agentName.trim() || selectedScopes.length === 0) return;
    try {
      setGenerating(true);
      setError(null);
      const functions = getFunctions();
      const generateApiKey = httpsCallable(functions, 'generateApiKey');
      const result = await generateApiKey({ name: agentName.trim(), scopes: selectedScopes });
      if (result?.data?.key) {
        setNewKey(result.data.key);
        // Add to list with prefix only
        setKeys((prev) => [
          {
            id: result.data.id,
            name: agentName.trim(),
            prefix: result.data.prefix,
            scopes: selectedScopes,
            createdAt: result.data.createdAt || new Date().toISOString(),
          },
          ...prev,
        ]);
        setAgentName('');
        setSelectedScopes([]);
      }
    } catch (err) {
      console.error('Failed to generate API key:', err);
      setError('Failed to generate key. Try again.');
    } finally {
      setGenerating(false);
    }
  }, [agentName, selectedScopes]);

  // --- Revoke key ---
  const handleRevoke = useCallback(async (keyId) => {
    try {
      setRevoking(keyId);
      const functions = getFunctions();
      const revokeApiKey = httpsCallable(functions, 'revokeApiKey');
      await revokeApiKey({ keyId });
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      setConfirmRevoke(null);
    } catch (err) {
      console.error('Failed to revoke API key:', err);
      setError('Failed to revoke key.');
    } finally {
      setRevoking(null);
    }
  }, []);

  // --- Copy key ---
  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // --- Dismiss new key display ---
  const dismissNewKey = () => setNewKey(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: '140%', height: '60%',
        background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto', padding: '20px 16px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.05))',
                border: '1px solid rgba(220,38,38,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Terminal size={18} color="#dc2626" />
              </div>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: '#fff', margin: 0,
                letterSpacing: '-0.02em',
              }}>
                Connected Agents
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, paddingLeft: 46 }}
            >
              Give your AI agent access to your fitness data
            </motion.p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
            }}
          >
            <X size={18} color="rgba(255,255,255,0.6)" />
          </motion.button>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: '#f87171',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Key Reveal */}
        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ marginBottom: 20 }}
            >
              <GlassCard highlight>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Key size={16} color="#dc2626" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Your New API Key</span>
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: 8, padding: '12px 14px', marginBottom: 12,
                    fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
                    fontSize: 13, color: '#4ade80', wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}>
                    {newKey}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCopy(newKey)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: copied
                          ? 'rgba(34,197,94,0.15)'
                          : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        border: copied ? '1px solid rgba(34,197,94,0.4)' : 'none',
                        borderRadius: 8, padding: '10px 0', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600,
                        color: copied ? '#4ade80' : '#fff',
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Key'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={dismissNewKey}
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '10px 18px', cursor: 'pointer',
                        fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      Done
                    </motion.button>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11, color: '#fb923c',
                    background: 'rgba(251,146,60,0.08)',
                    border: '1px solid rgba(251,146,60,0.2)',
                    borderRadius: 6, padding: '8px 10px',
                  }}>
                    <Shield size={12} />
                    Save this key now. It won't be shown again.
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Keys List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.35)',
          }}>
            <Key size={12} />
            Active Keys
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 24, height: 24, border: '2px solid rgba(220,38,38,0.2)',
                  borderTopColor: '#dc2626', borderRadius: '50%',
                  margin: '0 auto 12px',
                }}
              />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading keys...</span>
            </div>
          ) : keys.length === 0 ? (
            <GlassCard>
              <div style={{
                padding: '32px 16px', textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
                  background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Terminal size={22} color="rgba(255,255,255,0.2)" />
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>
                  No connected agents yet.
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  Generate a key below to get started.
                </p>
              </div>
            </GlassCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence>
                {keys.map((apiKey, i) => (
                  <motion.div
                    key={apiKey.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard>
                      <div style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))',
                                border: '1px solid rgba(220,38,38,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Key size={13} color="#dc2626" />
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                                {apiKey.name}
                              </span>
                            </div>
                            <span style={{
                              fontSize: 12, color: 'rgba(255,255,255,0.35)',
                              fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
                              paddingLeft: 36,
                            }}>
                              {apiKey.prefix}...
                            </span>
                          </div>
                          {confirmRevoke === apiKey.id ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleRevoke(apiKey.id)}
                                disabled={revoking === apiKey.id}
                                style={{
                                  background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)',
                                  borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                                  fontSize: 11, fontWeight: 600, color: '#f87171',
                                  opacity: revoking === apiKey.id ? 0.5 : 1,
                                }}
                              >
                                {revoking === apiKey.id ? 'Revoking...' : 'Confirm'}
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => setConfirmRevoke(null)}
                                style={{
                                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                                  fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
                                }}
                              >
                                Cancel
                              </motion.button>
                            </div>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.92 }}
                              onClick={() => setConfirmRevoke(apiKey.id)}
                              style={{
                                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                                borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 11, fontWeight: 500, color: '#f87171',
                              }}
                            >
                              <Trash2 size={11} />
                              Revoke
                            </motion.button>
                          )}
                        </div>
                        {/* Scopes */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 36, marginBottom: 6 }}>
                          {(apiKey.scopes || []).map((scope) => {
                            const c = scopeColor(scope);
                            return (
                              <span
                                key={scope}
                                style={{
                                  fontSize: 10, fontWeight: 600, letterSpacing: '0.03em',
                                  background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                                  borderRadius: 20, padding: '2px 8px',
                                }}
                              >
                                {scope}
                              </span>
                            );
                          })}
                        </div>
                        {/* Date */}
                        <div style={{ paddingLeft: 36, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                          Created {formatDate(apiKey.createdAt)}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Generate New Key */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.35)',
          }}>
            <Plus size={12} />
            Generate New Key
          </div>

          <GlassCard>
            <div style={{ padding: 16 }}>
              {/* Agent Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="My AI Agent"
                  maxLength={40}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '10px 12px',
                    fontSize: 14, color: '#fff', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(220,38,38,0.5)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
              </div>

              {/* Scopes */}
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)', marginBottom: 10,
                }}>
                  Permissions
                </label>

                {/* Read scopes */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: '#4ade80', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Eye size={10} />
                    Read
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {READ_SCOPES.map((scope) => {
                      const active = selectedScopes.includes(scope);
                      return (
                        <motion.button
                          key={scope}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleScope(scope)}
                          style={{
                            background: active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 20, padding: '5px 11px',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            color: active ? '#4ade80' : 'rgba(255,255,255,0.4)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {active && <Check size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                          {scope}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Write scopes */}
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: '#fb923c', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <EyeOff size={10} />
                    Write
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {WRITE_SCOPES.map((scope) => {
                      const active = selectedScopes.includes(scope);
                      return (
                        <motion.button
                          key={scope}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleScope(scope)}
                          style={{
                            background: active ? 'rgba(251,146,60,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? 'rgba(251,146,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 20, padding: '5px 11px',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            color: active ? '#fb923c' : 'rgba(255,255,255,0.4)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {active && <Check size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                          {scope}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={generating || !agentName.trim() || selectedScopes.length === 0}
                style={{
                  width: '100%',
                  background: (!agentName.trim() || selectedScopes.length === 0)
                    ? 'rgba(255,255,255,0.06)'
                    : 'linear-gradient(135deg, #dc2626, #991b1b)',
                  border: 'none', borderRadius: 10, padding: '12px 0',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  color: (!agentName.trim() || selectedScopes.length === 0)
                    ? 'rgba(255,255,255,0.25)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: generating ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: (!agentName.trim() || selectedScopes.length === 0)
                    ? 'none' : '0 4px 24px rgba(220,38,38,0.25)',
                }}
              >
                {generating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{
                        width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                      }}
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    Generate API Key
                  </>
                )}
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Docs / How to Use */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <GlassCard>
            <motion.button
              onClick={() => setShowDocs((prev) => !prev)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={14} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  How to use
                </span>
              </div>
              {showDocs ? (
                <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
              ) : (
                <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
              )}
            </motion.button>

            <AnimatePresence>
              {showDocs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 16px 16px', fontSize: 13, lineHeight: 1.7 }}>
                    <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 14px' }}>
                      Give this key to your AI agent. It can then read your workout data,
                      log meals, and more through the IronCore Open API.
                    </p>

                    <div style={{
                      background: 'rgba(0,0,0,0.5)', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '12px 14px', marginBottom: 14,
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)',
                        marginBottom: 8,
                      }}>
                        Example Request
                      </div>
                      <pre style={{
                        margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
                        fontSize: 11, color: '#4ade80', lineHeight: 1.6,
                      }}>
{`curl -H "Authorization: Bearer ic_YOUR_KEY" \\
  https://us-central1-ironcore-f68c2.cloudfunctions.net/apiGetProfile`}
                      </pre>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, color: 'rgba(220,38,38,0.8)',
                    }}>
                      <Shield size={12} />
                      <span>
                        Docs:{' '}
                        <span style={{
                          color: '#dc2626', fontWeight: 600,
                          textDecoration: 'underline', textUnderlineOffset: 2,
                        }}>
                          ironcore.ai/developers
                        </span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* Bottom spacer for safe area */}
        <div style={{ height: 40 }} />
      </div>
    </motion.div>
  );
};

export default ApiKeyManager;
