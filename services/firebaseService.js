const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } = require('firebase/firestore');
require('dotenv').config();

class FirebaseService {
  constructor() {
    this.initializeApp();
  }

  initializeApp() {
    try {
      // Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyDLUeII9goRwY_jeZNFoLFU1T8g-Jc6p4c",
        authDomain: "medinote-6b0b6.firebaseapp.com",
        projectId: "medinote-6b0b6",
        storageBucket: "medinote-6b0b6.firebasestorage.app",
        messagingSenderId: "1015876411021",
        appId: "1:1015876411021:web:f354643d7a075923b5ccc4"
      };

      // Initialize Firebase
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);

      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  // Database operations
  async addDocument(collectionName, data) {
    try {
      const docRef = await addDoc(collection(this.db, collectionName), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  async getDocument(collectionName, docId) {
    try {
      const docRef = doc(this.db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async getDocuments(collectionName, filters = []) {
    try {
      let q = collection(this.db, collectionName);
      
      // Apply filters
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
      
      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return documents;
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  async updateDocument(collectionName, docId, data) {
    try {
      const docRef = doc(this.db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      return { id: docId, ...data };
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(collectionName, docId) {
    try {
      const docRef = doc(this.db, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Simple middleware (no authentication required for assignment)
  async verifyTokenMiddleware(req, res, next) {
    // No authentication required for assignment
    req.user = { uid: 'user123', email: 'user@example.com' };
    next();
  }

  async optionalTokenMiddleware(req, res, next) {
    // No authentication required for assignment
    req.user = { uid: 'user123', email: 'user@example.com' };
    next();
  }
}

module.exports = new FirebaseService();
