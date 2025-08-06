# Microphone & Audio Troubleshooting Guide

## 🎤 Common Microphone Issues & Solutions

### **Issue: Microphone works initially but stops working after a while**

This is a common issue that can be caused by several factors:

#### **1. Browser Cache Issues**
**Solution:**
- **Clear browser cache and cookies**
- **Hard refresh**: Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
- **Try incognito/private mode** to test without extensions

#### **2. Browser Extensions Interference**
**Solution:**
- **Disable all browser extensions** temporarily
- **Test in incognito mode** (extensions are disabled by default)
- **Identify problematic extension** by enabling them one by one

#### **3. Audio Device Permissions**
**Solution:**
- **Check browser microphone permissions**:
  - Chrome: Click the microphone icon in the address bar
  - Firefox: Click the microphone icon in the address bar
  - Edge: Click the microphone icon in the address bar
- **Reset permissions** and allow microphone access again

#### **4. Audio Device Selection**
**Solution:**
- **Check system audio settings**:
  - Windows: Right-click speaker icon → Sound settings
  - Mac: System Preferences → Sound
- **Ensure correct microphone is selected**
- **Test microphone in system settings**

#### **5. Network/Connection Issues**
**Solution:**
- **Check internet connection**
- **Try refreshing the page**
- **Rejoin the meeting**

### **🔧 Quick Fixes**

#### **Immediate Solutions:**
1. **Refresh the page** (`F5` or `Ctrl + R`)
2. **Click the microphone button** in the meeting room to toggle it off/on
3. **Check if microphone is muted** (red slash icon)
4. **Try speaking louder** to trigger audio detection

#### **Browser-Specific Solutions:**

**Chrome:**
- Go to `chrome://settings/content/microphone`
- Remove the site from blocked list
- Allow microphone access

**Firefox:**
- Go to `about:preferences#privacy`
- Scroll to Permissions → Microphone
- Allow microphone access

**Edge:**
- Go to `edge://settings/content/microphone`
- Remove the site from blocked list
- Allow microphone access

### **🎯 Advanced Troubleshooting**

#### **1. Audio Device Reset**
```javascript
// In browser console (F12)
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    stream.getTracks().forEach(track => track.stop());
    console.log('Audio devices reset');
  })
  .catch(err => console.error('Error:', err));
```

#### **2. Check Audio Levels**
- **Windows**: Right-click speaker → Open Sound settings → Test microphone
- **Mac**: System Preferences → Sound → Input → Test microphone

#### **3. Browser Console Errors**
- **Press F12** to open developer tools
- **Check Console tab** for audio-related errors
- **Look for permission errors** or device access issues

### **🚀 Using the Audio Troubleshooter**

The meeting room now includes an **Audio Troubleshooter** button:

1. **Click "Audio Issues"** button in the bottom-right corner
2. **Run "Check Audio"** to diagnose problems
3. **Use "Reset Audio"** to restart audio devices
4. **Try "Request Permission"** to re-grant microphone access

### **📱 Mobile Device Issues**

#### **iOS Safari:**
- **Ensure microphone permission is granted**
- **Check if microphone is not blocked by Focus mode**
- **Try using Safari instead of other browsers**

#### **Android Chrome:**
- **Check app permissions** in device settings
- **Ensure microphone is not blocked by battery optimization**
- **Try clearing browser data**

### **🔄 Prevention Tips**

#### **Before Joining Meetings:**
1. **Test microphone** in system settings
2. **Close unnecessary applications** that might use audio
3. **Use wired headphones** for better audio quality
4. **Ensure stable internet connection**

#### **During Meetings:**
1. **Don't switch audio devices** while in a meeting
2. **Keep browser tab active** (don't minimize)
3. **Avoid using other audio applications** simultaneously
4. **Use the audio troubleshooter** if issues arise

### **🔍 Debugging Steps**

#### **Step 1: Check Browser Permissions**
```javascript
// Run in browser console
navigator.permissions.query({ name: 'microphone' })
  .then(result => console.log('Microphone permission:', result.state));
```

#### **Step 2: Test Audio Access**
```javascript
// Run in browser console
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('Audio access successful');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('Audio access failed:', err));
```

#### **Step 3: Check Available Devices**
```javascript
// Run in browser console
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const audioDevices = devices.filter(device => device.kind === 'audioinput');
    console.log('Available audio devices:', audioDevices);
  });
```

### **📞 Still Having Issues?**

If the problem persists:

1. **Try a different browser** (Chrome, Firefox, Edge, Safari)
2. **Use incognito/private mode**
3. **Clear all browser data** (cache, cookies, site data)
4. **Check system audio drivers** are up to date
5. **Try a different microphone/headset**
6. **Contact support** with specific error messages

### **✅ Success Indicators**

You'll know the microphone is working when:
- ✅ **Microphone icon is not crossed out**
- ✅ **Audio levels show activity** when speaking
- ✅ **Other participants can hear you**
- ✅ **No error messages** in browser console
- ✅ **Audio troubleshooter shows no issues**

---

**Remember**: Most microphone issues are temporary and can be resolved with a simple page refresh or browser restart. The Audio Troubleshooter component will help diagnose and fix most common issues automatically. 