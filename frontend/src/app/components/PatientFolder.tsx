import { SentimentChart } from './SentimentChart';
import { Sparkles, Video, MessageCircle, ArrowLeft, Mail, Phone, Calendar } from 'lucide-react';
import type { PsychologistPatient } from '../types/app';

interface PatientFolderProps {
  patient: PsychologistPatient;
  onBack: () => void;
  onStartChat: () => void;
  onStartVideoCall: () => void;
}

export function PatientFolder({ patient, onBack, onStartChat, onStartVideoCall }: PatientFolderProps) {
  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2>{patient.name}</h2>
                <p className="text-muted-foreground">Age {patient.age} • {patient.sessions} sessions completed</p>
                {patient.diagnosis && (
                  <p className="text-sm text-muted-foreground mt-1">{patient.diagnosis}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onStartChat}
                className="flex items-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-5 h-5" />
                Chat
              </button>
              <button
                onClick={onStartVideoCall}
                className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
              >
                <Video className="w-5 h-5" />
                Start Video Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <h4>Last Session</h4>
            </div>
            <p>{patient.lastSession || 'N/A'}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <h4>Next Session</h4>
            </div>
            <p>{patient.nextSession || 'Not scheduled'}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <h4>Contact</h4>
            </div>
            <p className="text-sm text-muted-foreground">{patient.email}</p>
            <p className="text-sm text-muted-foreground mt-1">{patient.phone}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3>Latest AI Summary</h3>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm">
                <strong>Main Topics:</strong> {patient.aiSummary.mainTopics.join(', ')}
              </p>
              <p className="text-sm">
                <strong>Progress:</strong> {patient.aiSummary.progress}
              </p>
              <p className="text-sm">
                <strong>Action Items:</strong> {patient.aiSummary.actionItems}
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="mb-4">Mood Trend Analysis</h3>
            {patient.sentimentData.length > 0 ? <SentimentChart data={patient.sentimentData} /> : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 text-center text-sm text-muted-foreground">
                Mood trend will appear after the patient tracks their first entries.
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {patient.sentimentData.length > 0 ? 'Average mood is calculated from stored patient entries' : 'Waiting for data'}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="mb-4">Recent Session Notes</h3>
          <div className="space-y-3">
            {patient.recentNotes.length > 0 ? patient.recentNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4>Session {note.sessionNumber}</h4>
                  <span className="text-sm text-muted-foreground">{note.date}</span>
                </div>
                <p className="text-sm text-muted-foreground">{note.preview}</p>
              </div>
            )) : (
              <div className="rounded-[1.75rem] border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
                This folder will fill with real notes once sessions are documented in the database.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
