import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { School, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user exists in Firestore by UID or Email
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        // Try to find by email in users collection (for pre-created students/staff)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', result.user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Link the Google UID to the existing user record
          const existingUser = querySnapshot.docs[0];
          await setDoc(doc(db, 'users', result.user.uid), {
            ...existingUser.data(),
            uid: result.user.uid
          });
        } else {
          // Create a default Super Admin for the first user (demo purposes)
          await setDoc(doc(db, 'users', result.user.uid), {
            fullName: result.user.displayName || 'New User',
            username: result.user.email?.split('@')[0] || 'user',
            email: result.user.email,
            role: 'Super Admin',
            isActive: true,
            createdOn: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      setError('Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mb-4">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Faizan Islamic School</h1>
          <p className="text-gray-500 mt-2">School Management System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
          <p className="font-bold mb-1">Login Instructions:</p>
          <div className="space-y-2">
            <div>
              <p className="font-semibold">Admin Login:</p>
              <p>Email: admin@faizan.com / Password: 123456</p>
            </div>
            <div>
              <p className="font-semibold">Student Login:</p>
              <p>Email: [YourRollNumber]@faizan.com / Password: 123456</p>
              <p className="text-[10px] opacity-70 mt-1">Example: STU-2026-1234@faizan.com</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@faizan.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : <><LogIn className="w-4 h-4" /> Login</>}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full border border-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Google Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
