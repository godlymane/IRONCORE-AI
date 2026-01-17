import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Dumbbell } from 'lucide-react';
import { callGemini, cleanAIResponse } from '../utils/helpers';
import { Button } from '../components/UIComponents';

export const CoachView = ({ weight, meals, workouts, profile }) => {
  const [mode, setMode] = useState('chat'); 
  const [messages, setMessages] = useState([
      { role: 'ai', text: `Coach here. I see you're aiming to ${profile?.goal || 'improve'}. What's the plan today?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [genEquipment, setGenEquipment] = useState('gym');
  const [genDuration, setGenDuration] = useState('45');
  const [genFocus, setGenFocus] = useState('Push');
  const [customFocus, setCustomFocus] = useState(""); 
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (textOverride) => {
    const text = textOverride || input;
    if (!text.trim()) return;

    const newMsg = { role: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    try {
        const today = new Date().toISOString().split('T')[0];
        const todayMeals = meals.filter(m => m.date === today);
        const cals = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
        
        const context = `User Profile: ${weight || 'Unknown'}kg, Goal: ${profile?.goal}. Cals Today: ${cals}.`;
        
        // Pass 'false' for expectJson to get normal text
        const response = await callGemini(
            text, 
            `You are an elite fitness coach (Mike Mentzer style). Context: ${context}. Keep answers short, intense, and motivating. No JSON.`,
            null,
            false // <--- EXPECT TEXT
        );
        
        if (response) {
            // Safety check: if it still returns JSON string, parse it
            let displayText = response;
            try {
                const possibleJson = JSON.parse(response);
                if (possibleJson.message) displayText = possibleJson.message;
            } catch(e) {
                // Not JSON, use as is
            }
            setMessages(prev => [...prev, { role: 'ai', text: displayText }]);
        } else {
            setMessages(prev => [...prev, { role: 'ai', text: "Connection weak. Try again." }]);
        }
    } catch (e) {
        setMessages(prev => [...prev, { role: 'ai', text: "Network error." }]);
    } finally {
        setLoading(false);
    }
  };

  const generateWorkout = async () => {
      setLoading(true);
      const focus = genFocus === 'Custom' ? customFocus : genFocus;
      const prompt = `Create a ${genDuration} minute ${focus} workout using ${genEquipment}. Return JSON: { "title": "string", "exercises": [ { "name": "string", "sets": "string", "reps": "string", "rest": "string" } ] }`;
      
      try {
          // Pass 'true' for expectJson
          const res = await callGemini(
              prompt, 
              "You are a strict personal trainer. JSON only.", 
              null, 
              true // <--- EXPECT JSON
          );
          const plan = cleanAIResponse(res);
          if (plan) setGeneratedPlan(plan);
          else alert("AI failed to generate plan. Try again.");
      } catch(e) {
          alert("Coach is busy. Try again.");
      } finally {
          setLoading(false);
      }
  };

  const SPLITS = ['Push', 'Pull', 'Legs', 'Arnold Split', 'Upper', 'Lower', 'Full Body', 'Bro Split', 'Custom'];

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col animate-in fade-in">
      
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><Bot size={24} className="text-white"/></div>
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">Coach</h2>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">AI Powered</p>
            </div>
          </div>
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800">
              <button onClick={() => setMode('chat')} className={`p-2 rounded-lg transition-all ${mode==='chat' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}><Bot size={16}/></button>
              <button onClick={() => setMode('generator')} className={`p-2 rounded-lg transition-all ${mode==='generator' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500'}`}><Dumbbell size={16}/></button>
          </div>
      </div>

      {mode === 'generator' ? (
          <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6">
              {!generatedPlan ? (
                  <div className="space-y-4">
                      <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-6 rounded-3xl text-center">
                          <Sparkles className="mx-auto text-indigo-400 mb-2" size={32}/>
                          <h3 className="text-xl font-black italic text-white uppercase">Pro Generator</h3>
                          <p className="text-xs text-indigo-300 mt-1">Instant personalized routines.</p>
                      </div>

                      <div className="space-y-3">
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Target / Split</label>
                              <div className="grid grid-cols-3 gap-2 mt-1">
                                  {SPLITS.map(f => (
                                      <button key={f} onClick={()=>setGenFocus(f)} className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${genFocus===f ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>{f}</button>
                                  ))}
                              </div>
                              {genFocus === 'Custom' && (
                                  <input 
                                    value={customFocus} 
                                    onChange={e=>setCustomFocus(e.target.value)} 
                                    placeholder="e.g. Glute Focus, Arms Only..." 
                                    className="w-full mt-2 bg-black p-3 rounded-xl border border-indigo-500/50 text-white text-sm outline-none animate-in fade-in"
                                  />
                              )}
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Equipment</label>
                              <select value={genEquipment} onChange={e=>setGenEquipment(e.target.value)} className="w-full bg-gray-900 p-3 rounded-xl text-white text-sm outline-none border border-gray-800 mt-1">
                                  <option value="gym">Full Gym Access</option>
                                  <option value="dumbbells">Dumbbells Only</option>
                                  <option value="bodyweight">Bodyweight (No Gear)</option>
                                  <option value="home">Home Gym (Bands/DBs)</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Time Available</label>
                              <select value={genDuration} onChange={e=>setGenDuration(e.target.value)} className="w-full bg-gray-900 p-3 rounded-xl text-white text-sm outline-none border border-gray-800 mt-1">
                                  <option value="15">15 Minutes (Express)</option>
                                  <option value="30">30 Minutes</option>
                                  <option value="45">45 Minutes (Standard)</option>
                                  <option value="60">60 Minutes (Intense)</option>
                              </select>
                          </div>
                      </div>

                      <Button onClick={generateWorkout} loading={loading} className="w-full py-4 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 border-0">
                          {loading ? "Designing Plan..." : "Generate Workout"}
                      </Button>
                  </div>
              ) : (
                  <div className="space-y-4 animate-in slide-in-from-bottom-8">
                      <div className="flex justify-between items-start">
                          <div>
                              <h3 className="text-xl font-black italic text-white uppercase">{generatedPlan.title}</h3>
                              <p className="text-xs text-gray-500">AI Generated • {genDuration} Mins</p>
                          </div>
                          <button onClick={()=>setGeneratedPlan(null)} className="text-xs text-red-400 font-bold uppercase">Reset</button>
                      </div>

                      <div className="space-y-2">
                          {generatedPlan.exercises.map((ex, i) => (
                              <div key={i} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <div className="bg-gray-800 text-gray-400 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                                          <p className="font-bold text-white text-sm">{ex.name}</p>
                                      </div>
                                      <p className="text-[10px] text-gray-500 pl-8 mt-1">{ex.rest} Rest</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-indigo-400 font-black font-mono">{ex.sets} Sets</p>
                                      <p className="text-xs text-gray-400">{ex.reps} Reps</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <Button className="w-full">Start This Workout</Button>
                  </div>
              )}
          </div>
      ) : (
          <>
            <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-4 p-2 custom-scrollbar pb-4">
                {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-none'}`}>
                    {msg.text}
                    </div>
                </div>
                ))}
                {loading && <div className="text-xs text-gray-500 animate-pulse pl-2">Thinking...</div>}
            </div>
            <div className="flex gap-2 mt-2 bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800 backdrop-blur-md">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask coach..." className="flex-grow bg-transparent px-4 py-3 text-white outline-none placeholder:text-gray-600 text-sm" />
                <button onClick={() => sendMessage()} disabled={loading} className="bg-indigo-600 p-3 rounded-xl text-white hover:bg-indigo-500 transition-all"><Send size={18} /></button>
            </div>
          </>
      )}
    </div>
  );
};