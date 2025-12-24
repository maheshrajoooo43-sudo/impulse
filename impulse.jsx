import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  setDoc 
} from 'firebase/firestore';
import { 
  LucideLayoutDashboard, 
  LucideSettings, 
  LucideLogOut, 
  LucideUser, 
  LucidePhone, 
  LucideMapPin, 
  LucideCheckCircle, 
  LucideShieldCheck 
} from 'lucide-react';

// Firebase Configuration from environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'impulse-academy-default';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); // 'home' or 'admin'
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState({
    directorMessage: "Our aim at 'The Impulse Academy' is to provide quality education to smaller cities like Giridih...",
    phone: "+91 97988 06907",
    address: "Sihodih Rd, Pandardih, Giridih, Jharkhand 815302",
    admissionStatus: "Admission Open 2025-26"
  });
  const [inquiries, setInquiries] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [passcode, setPasscode] = useState('');

  // 1. Auth Logic - Rule 3: Auth Before Queries
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Authentication failed:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Site Content & Inquiries - Rule 1 & 2
  useEffect(() => {
    if (!user) return;

    // Corrected Path segments: artifacts -> {appId} -> public -> data -> config (6 segments total)
    // segments: [0]artifacts, [1]appId, [2]public, [3]data, [4]config_col, [5]docId
    // Standard segment counting: collection/doc/collection/doc...
    // To ensure even segments (doc ref), we use: artifacts/{appId}/public/data/siteConfig/main
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'siteConfig', 'main');
    
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setSiteData(docSnap.data());
      } else {
        setDoc(configRef, siteData);
      }
    }, (err) => console.error("Config fetch error:", err));

    const inquiryCol = collection(db, 'artifacts', appId, 'public', 'data', 'inquiries');
    const unsubInquiries = onSnapshot(inquiryCol, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInquiries(list);
    }, (err) => console.error("Inquiry fetch error:", err));

    return () => { unsubConfig(); unsubInquiries(); };
  }, [user]);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      class: formData.get('class'),
      phone: formData.get('phone'),
      timestamp: new Date().toISOString()
    };
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inquiries'), data);
      alert("Inquiry submitted successfully!");
      e.target.reset();
    } catch (err) {
      alert("Error submitting. Please try again.");
    }
  };

  const updateSiteConfig = async (newData) => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'siteConfig', 'main');
    try {
      await updateDoc(configRef, newData);
      alert("Website updated successfully!");
    } catch (err) {
      alert("Failed to update website: " + err.message);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      <p className="text-gray-600 font-medium">Loading Academy Portal...</p>
    </div>
  );

  // --- ADMIN VIEW ---
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <aside className="w-64 bg-blue-900 text-white p-6 hidden md:block">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
            <LucideShieldCheck /> Admin Panel
          </h2>
          <nav className="space-y-4">
            <button className="w-full text-left p-2 bg-blue-800 rounded flex items-center gap-2">
              <LucideLayoutDashboard size={18} /> Dashboard
            </button>
            <button onClick={() => setView('home')} className="w-full text-left p-2 hover:bg-blue-800 rounded flex items-center gap-2 mt-auto">
              <LucideLogOut size={18} /> Exit Admin
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Management Dashboard</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
                <LucideSettings size={20} /> Edit Website Content
              </h2>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                updateSiteConfig({
                  directorMessage: fd.get('directorMessage'),
                  phone: fd.get('phone'),
                  admissionStatus: fd.get('admissionStatus')
                });
              }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admission Headline</label>
                  <input name="admissionStatus" defaultValue={siteData.admissionStatus} className="w-full p-2 border rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Director's Message</label>
                  <textarea name="directorMessage" defaultValue={siteData.directorMessage} className="w-full p-2 border rounded mt-1 h-32 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                  <input name="phone" defaultValue={siteData.phone} className="w-full p-2 border rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button type="submit" className="bg-blue-700 text-white px-4 py-3 rounded-lg hover:bg-blue-800 w-full font-bold transition-colors">
                  Save Changes
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
                <LucideUser size={20} /> Recent Inquiries ({inquiries.length})
              </h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {inquiries.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((iq) => (
                  <div key={iq.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-800">{iq.name}</p>
                      <span className="text-[10px] text-gray-500">{new Date(iq.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600">Class: {iq.class}</p>
                    <p className="text-sm font-bold text-blue-700 mt-1 flex items-center gap-1">
                      <LucidePhone size={12} /> {iq.phone}
                    </p>
                  </div>
                ))}
                {inquiries.length === 0 && <p className="text-gray-400 text-center py-8 italic">No inquiries yet.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- PUBLIC WEBSITE VIEW ---
  return (
    <div className="bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-black text-xl text-blue-800 tracking-tighter">THE IMPULSE ACADEMY</div>
          <div className="hidden md:flex gap-8 text-sm font-semibold text-gray-600 uppercase">
            <a href="#home" className="hover:text-blue-800">Home</a>
            <a href="#about" className="hover:text-blue-800">About</a>
            <a href="#contact" className="hover:text-blue-800">Enroll</a>
            <button onClick={() => setShowLogin(true)} className="text-[10px] font-bold border px-2 py-1 rounded">ADMIN</button>
          </div>
        </div>
      </nav>

      <section id="home" className="relative h-[60vh] flex items-center justify-center text-center bg-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1523050353091-f1198b010498?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        <div className="relative z-10 px-4">
          <span className="bg-yellow-400 text-blue-900 px-4 py-1 rounded-full text-xs font-black mb-6 inline-block">
            {siteData.admissionStatus}
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-6">Empowering Future Achievers</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-blue-100 mb-10">Quality JEE & NEET coaching in Giridih by Director Sujeet Kumar Verma.</p>
          <a href="#contact" className="bg-white text-blue-900 px-10 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform inline-block">Enroll Now</a>
        </div>
      </section>

      <section id="about" className="py-20 max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black text-blue-900 mb-6">Message from Director</h2>
            <p className="text-gray-700 italic text-xl border-l-4 border-blue-700 pl-6 leading-relaxed">
              "{siteData.directorMessage}"
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="bg-blue-700 p-3 rounded-full text-white"><LucideUser size={20} /></div>
              <div>
                <p className="font-bold">Sujeet Kumar Verma</p>
                <p className="text-xs text-blue-700 font-bold uppercase">Managing Director</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 shadow-sm space-y-4">
            <h3 className="font-bold text-xl text-blue-900 mb-2">Academic Excellence</h3>
            <div className="flex gap-4 items-start">
              <LucideCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-600">Foundation courses from Class 8th onwards targeting IIT/NEET.</p>
            </div>
            <div className="flex gap-4 items-start">
              <LucideCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-600">Expert guidance for CBSE, JAC, and ICSE boards.</p>
            </div>
            <div className="flex gap-4 items-start">
              <LucideCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-600">Scholarship programs for hardworking and deserving students.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-4xl font-black mb-6">Join Us Today</h2>
            <p className="text-blue-200 mb-8">Ready to clear your entrance exams? Fill the form and start your journey.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-blue-100"><LucidePhone size={20} /> {siteData.phone}</div>
              <div className="flex items-center gap-4 text-blue-100"><LucideMapPin size={20} /> {siteData.address}</div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl text-gray-900 shadow-2xl">
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <input name="name" required placeholder="Student Name" className="w-full p-4 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
              <select name="class" className="w-full p-4 border rounded-xl bg-gray-50">
                <option>Class 8th-10th Foundation</option>
                <option>Class 11th-12th (Science)</option>
                <option>JEE/NEET Repeater</option>
              </select>
              <input name="phone" required type="tel" placeholder="Mobile Number" className="w-full p-4 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
              <button className="w-full bg-blue-800 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-900 transition-colors">Submit Inquiry</button>
            </form>
          </div>
        </div>
      </section>

      {showLogin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm">
            <h2 className="text-2xl font-black text-center mb-6">Admin Login</h2>
            <input 
              type="password" 
              placeholder="Passcode" 
              className="w-full p-4 border rounded-xl mb-4 text-center text-xl tracking-[0.3em]"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <button 
              onClick={() => {
                if (passcode === 'admin123') {
                  setView('admin');
                  setShowLogin(false);
                  setPasscode('');
                } else {
                  alert("Incorrect Passcode");
                }
              }}
              className="w-full bg-blue-800 text-white py-4 rounded-xl font-bold mb-3"
            >
              Login
            </button>
            <button onClick={() => setShowLogin(false)} className="w-full text-gray-400 py-2">Cancel</button>
          </div>
        </div>
      )}

      <footer className="bg-gray-900 text-white py-12 text-center text-xs opacity-50 uppercase tracking-[0.2em]">
        &copy; 2025 THE IMPULSE ACADEMY. DEVELOPED BY MAHESH KUMAR VERMA.
      </footer>
    </div>
  );
}