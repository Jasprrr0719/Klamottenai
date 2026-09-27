import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tab, setTab] = useState('wardrobe');

  // Auth-States
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Kleiderschrank-States
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('Hoodie');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Profil-States
  const [profile, setProfile] = useState(null);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Generator-States
  const [selectedItemId, setSelectedItemId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [outfits, setOutfits] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    if (user) {
      fetchItems();
      fetchProfile();
      fetchOutfits();
    }
  }, [user]);

  async function fetchItems() {
    const res = await fetch(`/.netlify/functions/get-clothing-items?userId=${user.id}`);
    const data = await res.json();
    if (data.success) setItems(data.items);
  }

  async function fetchProfile() {
    const res = await fetch(`/.netlify/functions/get-profile?userId=${user.id}`);
    const data = await res.json();
    if (data.success && data.profile) {
      setProfile(data.profile);
      setHeight(data.profile.height_cm || '');
      setWeight(data.profile.weight_kg || '');
    }
  }

  async function fetchOutfits() {
    const res = await fetch(`/.netlify/functions/get-outfits?userId=${user.id}`);
    const data = await res.json();
    if (data.success) setOutfits(data.outfits);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file, bucket) {
    const base64 = await fileToBase64(file);
    const res = await fetch('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileBase64: base64,
        contentType: file.type,
        bucket
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.url;
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? 'login-user' : 'register-user';
      const res = await fetch(`/.netlify/functions/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const userData = { id: data.userId, username: data.username };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    setUser(null);
    setItems([]);
    setProfile(null);
    setOutfits([]);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'clothing-images');
      const addRes = await fetch('/.netlify/functions/add-clothing-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, image_url: url, tags: '', userId: user.id })
      });
      const addData = await addRes.json();
      if (!addData.success) throw new Error(addData.error);
      await fetchItems();
      setFile(null);
      e.target.reset();
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      let front_photo_url = profile?.front_photo_url || null;
      let back_photo_url = profile?.back_photo_url || null;

      if (frontFile) front_photo_url = await uploadImage(frontFile, 'person-photos');
      if (backFile) back_photo_url = await uploadImage(backFile, 'person-photos');

      const res = await fetch('/.netlify/functions/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front_photo_url,
          back_photo_url,
          height_cm: height ? parseInt(height) : null,
          weight_kg: weight ? parseInt(weight) : null,
          userId: user.id
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setProfile(data.profile);
      setFrontFile(null);
      setBackFile(null);
      alert('Profil gespeichert!');
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDeleteItem(id) {
    if (!confirm('Dieses Kleidungsstück wirklich löschen?')) return;
    try {
      const res = await fetch('/.netlify/functions/delete-clothing-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: user.id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchItems();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  }

  async function handleDeleteOutfit(id) {
    if (!confirm('Dieses Outfit wirklich löschen?')) return;
    try {
      const res = await fetch('/.netlify/functions/delete-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: user.id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchOutfits();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  }

  async function handleRandomGenerate() {
    if (!profile?.front_photo_url) {
      alert('Bitte zuerst ein Vorne-Foto im Profil hochladen!');
      return;
    }
    if (items.length === 0) {
      alert('Du brauchst mindestens ein Kleidungsstück im Kleiderschrank!');
      return;
    }

    const randomItem = items[Math.floor(Math.random() * items.length)];
    setGenerating(true);

    try {
      const genRes = await fetch('/.netlify/functions/generate-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImageUrl: profile.front_photo_url,
          clothingImageUrl: randomItem.image_url
        })
      });
      const genData = await genRes.json();
      if (!genData.success) throw new Error(genData.error);

      const saveRes = await fetch('/.netlify/functions/save-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempImageUrl: genData.resultImageUrl, itemIds: [randomItem.id], userId: user.id })
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);

      await fetchOutfits();
      alert('Zufalls-Outfit generiert!');
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerate() {
    if (!profile?.front_photo_url) {
      alert('Bitte zuerst ein Vorne-Foto im Profil hochladen!');
      return;
    }
    if (!selectedItemId) {
      alert('Bitte ein Kleidungsstück auswählen!');
      return;
    }

    const selectedItem = items.find((i) => i.id === selectedItemId);
    setGenerating(true);

    try {
      const genRes = await fetch('/.netlify/functions/generate-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImageUrl: profile.front_photo_url,
          clothingImageUrl: selectedItem.image_url
        })
      });
      const genData = await genRes.json();
      if (!genData.success) throw new Error(genData.error);

      const saveRes = await fetch('/.netlify/functions/save-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempImageUrl: genData.resultImageUrl,
          itemIds: [selectedItem.id],
          userId: user.id
        })
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);

      await fetchOutfits();
      alert('Outfit generiert!');
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  // --- Login/Registrierung-Ansicht ---
  if (!user) {
    return (
      <div className="app-container">
        <div className="auth-container card">
          <h1 className="app-title">Outfit Generator</h1>
          <form onSubmit={handleAuth}>
            <div className="form-row">
              <label>Benutzername</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label>Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={authLoading}>
              {authLoading ? 'Bitte warten...' : authMode === 'login' ? 'Einloggen' : 'Registrieren'}
            </button>
            {authError && <p className="error-text">{authError}</p>}
          </form>
          <p className="auth-switch">
            {authMode === 'login' ? (
              <>Noch kein Konto? <a onClick={() => { setAuthMode('register'); setAuthError(''); }}>Registrieren</a></>
            ) : (
              <>Schon ein Konto? <a onClick={() => { setAuthMode('login'); setAuthError(''); }}>Einloggen</a></>
            )}
          </p>
        </div>
      </div>
    );
  }

  // --- Hauptansicht ---
  return (
    <div className="app-container">
      <h1 className="app-title">Outfit Generator</h1>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'wardrobe' ? 'active' : ''}`} onClick={() => setTab('wardrobe')}>
          👕 Kleiderschrank
        </button>
        <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          🙋 Profil
        </button>
        <button className={`tab-btn ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
          ✨ Generieren
        </button>
      </div>

      {tab === 'wardrobe' && (
        <>
          <div className="card">
            <h2 className="section-title">Neues Kleidungsstück</h2>
            <form onSubmit={handleUpload}>
              <div className="form-row">
                <label>Kategorie</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Hoodie</option>
                  <option>Hose</option>
                  <option>Jacke</option>
                  <option>Schuhe</option>
                  <option>Gürtel</option>
                  <option>Accessoire</option>
                </select>
              </div>
              <div className="form-row">
                <label>Foto</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <button type="submit" className="btn-secondary" disabled={uploading}>
                {uploading ? 'Lädt hoch...' : '+ Hinzufügen'}
              </button>
            </form>
          </div>

          <h2 className="section-title">Deine Kleidungsstücke ({items.length})</h2>
          <div className="grid">
            {items.map((item) => (
              <div key={item.id} className="grid-item">
                <img src={item.image_url} alt={item.category} onClick={() => setZoomedImage(item.image_url)} />
                <div className="label">{item.category}</div>
                <button className="btn-danger" onClick={() => handleDeleteItem(item.id)}>
                  Löschen
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'profile' && (
        <div className="card">
          <h2 className="section-title">Mein Profil</h2>
          <form onSubmit={handleProfileSave}>
            <div className="form-row">
              <label>Foto von vorne</label>
              <input type="file" accept="image/*" onChange={(e) => setFrontFile(e.target.files[0])} />
              {profile?.front_photo_url && !frontFile && (
                <img className="preview-img" src={profile.front_photo_url} alt="vorne" />
              )}
            </div>

            <div className="form-row">
              <label>Foto von hinten</label>
              <input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files[0])} />
              {profile?.back_photo_url && !backFile && (
                <img className="preview-img" src={profile.back_photo_url} alt="hinten" />
              )}
            </div>

            <div className="form-row">
              <label>Größe (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>

            <div className="form-row">
              <label>Gewicht (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>

            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Speichert...' : 'Profil speichern'}
            </button>
          </form>
        </div>
      )}

      {tab === 'generate' && (
        <>
          <div className="card">
            <h2 className="section-title">🎲 Zufälliges Outfit</h2>
            <button className="btn-primary" onClick={handleRandomGenerate} disabled={generating}>
              {generating ? 'Generiert... (kann etwas dauern)' : 'Zufälliges Outfit generieren'}
            </button>
            <p className="hint-text">Wählt ein zufälliges Kleidungsstück aus deinem Kleiderschrank.</p>
          </div>

          <div className="card">
            <h2 className="section-title">Manuelle Auswahl</h2>
            <div className="form-row">
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                <option value="">-- Kleidungsstück wählen --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.category} ({item.id.slice(0, 6)})
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-secondary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generiert...' : 'Outfit generieren'}
            </button>
          </div>

          <h2 className="section-title">Deine generierten Outfits ({outfits.length})</h2>
          <div className="outfit-grid">
            {outfits.map((outfit) => (
              <div key={outfit.id} className="outfit-grid-item">
                <img src={outfit.result_image_url} alt="Outfit" onClick={() => setZoomedImage(outfit.result_image_url)} />
                <button className="btn-danger" onClick={() => handleDeleteOutfit(outfit.id)}>
                  Löschen
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="logout-link">
        <a onClick={handleLogout}>Ausloggen ({user.username})</a>
      </div>

      {zoomedImage && (
        <div className="zoom-overlay" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="Vergrößert" className="zoom-image" />
        </div>
      )}
    </div>
  );
}

export default App;