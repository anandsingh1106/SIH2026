import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, Pill, Stethoscope, Share2, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export const DoctorTelemedicinePage: React.FC = () => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callActive, setCallActive] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'patient', text: 'Namaskar Doctor. My blood sugar reading this morning was 188.', time: '10:14 AM' },
    { sender: 'doctor', text: 'Namaskar Ramesh ji. Are you taking Metformin regularly after meals?', time: '10:15 AM' },
  ]);
  const [msgInput, setMsgInput] = useState('');
  const [notes, setNotes] = useState('Patient reports adherence to diet. Fasting sugar: 132 mg/dL, PP: 188 mg/dL. Reassure and continue current dose.');

  const handleSendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    setChatMessages([...chatMessages, { sender: 'doctor', text: msgInput, time: 'Just now' }]);
    setMsgInput('');
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Telemedicine Virtual OPD Clinic Room' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Video className="w-6 h-6 text-gov-700" />
            Telemedicine Virtual OPD & Video Consultation Room
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Encrypted WebRTC teleconsultation channel connecting remote village subcenters with doctors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={callActive ? 'success' : 'danger'} size="md">
            {callActive ? '🔴 LIVE CONSULTATION (08:45)' : 'CALL ENDED'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video Canvas & Controls (Left 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-sand-900 rounded-2xl overflow-hidden aspect-video relative flex flex-col justify-between p-4 shadow-xl border border-sand-800">
            {/* Top Video Overlay */}
            <div className="flex items-center justify-between z-10">
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Ramesh Tukaram Patil (48y/M • Paud)</span>
              </div>
              <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-gov-200 font-mono">
                ABHA: 91-4521-8890-1200
              </div>
            </div>

            {/* Main Video Body Placeholder */}
            <div className="flex-1 flex items-center justify-center text-center">
              {isVideoOn ? (
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-full bg-gov-700/80 text-white font-bold text-3xl flex items-center justify-center mx-auto border-4 border-gov-500 shadow-lg">
                    RP
                  </div>
                  <div className="text-white font-bold text-sm">Ramesh Patil (Connected via Paud Subcenter)</div>
                  <div className="text-xs text-emerald-400">HD Video 1080p • Latency 24ms</div>
                </div>
              ) : (
                <div className="text-ink-soft text-xs">Video Feed Paused</div>
              )}
            </div>

            {/* Doctor PIP preview */}
            <div className="absolute bottom-16 right-4 w-36 h-24 bg-sand-800 rounded-xl border border-sand-700 shadow-md flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              <div className="text-center">
                <div>Dr. Deshmukh</div>
                <div className="text-[10px] text-ink-soft font-normal">PHC Paud (You)</div>
              </div>
            </div>

            {/* Bottom Call Controls Bar */}
            <div className="flex items-center justify-center gap-3 z-10 bg-black/60 backdrop-blur-md p-2 rounded-2xl w-fit mx-auto">
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-3 rounded-xl transition-colors ${
                  isMicOn ? 'bg-sand-700 hover:bg-sand-600 text-white' : 'bg-red-600 text-white'
                }`}
                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-3 rounded-xl transition-colors ${
                  isVideoOn ? 'bg-sand-700 hover:bg-sand-600 text-white' : 'bg-red-600 text-white'
                }`}
                title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={() => alert('Sharing medical report / diagnostic scan with patient...')}
                className="p-3 bg-sand-700 hover:bg-sand-600 text-white rounded-xl"
                title="Share Screen / Report"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => setCallActive(!callActive)}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                title="End Teleconsultation"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Clinical Sidepanel & Live Chat (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col h-[500px]">
          {/* Real-time Vitals Bar */}
          <div className="bg-surface rounded-2xl border border-line p-4 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-sand-700 uppercase tracking-wider">
              Connected Telemetry Vitals
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-sand-50 p-2 rounded-lg border border-line">
                <span className="text-[10px] text-ink-soft block">BP</span>
                <span className="font-bold text-ink">146/92</span>
              </div>
              <div className="bg-sand-50 p-2 rounded-lg border border-line">
                <span className="text-[10px] text-ink-soft block">Pulse</span>
                <span className="font-bold text-ink">82 bpm</span>
              </div>
              <div className="bg-sand-50 p-2 rounded-lg border border-line">
                <span className="text-[10px] text-ink-soft block">SpO2</span>
                <span className="font-bold text-emerald-700">98%</span>
              </div>
            </div>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 bg-surface rounded-2xl border border-line shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="p-3 bg-sand-50 border-b border-line font-bold text-xs text-ink flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-gov-700" />
              Live Consultation Chat
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-sand-50/30">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'doctor' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl p-2.5 text-xs leading-relaxed ${
                      m.sender === 'doctor'
                        ? 'bg-gov-700 text-white rounded-br-xs'
                        : 'bg-surface text-ink border border-line rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-ink-soft mt-0.5">{m.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMsg} className="p-2 border-t border-line bg-surface flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Type message..."
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                className="flex-1 text-xs border border-sand-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gov-600"
              />
              <Button type="submit" variant="primary" size="sm">
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
