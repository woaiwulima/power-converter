/* ============================================
   Optical Power Calculator - Main Logic
   Module 1: mW ↔ dBm ↔ V (50Ω)
   Module 2: Gain Calculator  
   Module 3: Cascade Link Budget
   ============================================ */

// ========== Module 1: Unit Converter ==========
function convertPower() {
  const inputMode = document.getElementById('inputMode1').value;
  const inputValue = parseFloat(document.getElementById('inputValue1').value);
  
  if (isNaN(inputValue) || inputValue === 0) {
    clearResults1();
    return;
  }
  
  // Constants
  const Z0 = 50; // ohm
  const V_factor = Math.sqrt(Z0 / 1000); // converts mW to V (for 50 ohm)
  
  let mW, dBm, V;
  
  switch (inputMode) {
    case 'mW':
      mW = inputValue;
      dBm = 10 * Math.log10(mW);
      V = Math.sqrt(mW * Z0 / 1000);
      break;
    case 'dBm':
      dBm = inputValue;
      mW = Math.pow(10, dBm / 10);
      V = Math.sqrt(mW * Z0 / 1000);
      break;
    case 'V':
      V = inputValue;
      mW = (V * V) * 1000 / Z0;
      dBm = 10 * Math.log10(mW);
      break;
  }
  
  document.getElementById('result-mW').textContent = mW.toFixed(6);
  document.getElementById('result-dBm').textContent = dBm.toFixed(4);
  document.getElementById('result-V').textContent = V.toFixed(6);
}

function clearResults1() {
  document.getElementById('result-mW').textContent = '—';
  document.getElementById('result-dBm').textContent = '—';
  document.getElementById('result-V').textContent = '—';
}

// ========== Module 2: Gain Calculator ==========
function calculateGain() {
  const inputMode = document.getElementById('inputMode2').value;
  const inputValue = parseFloat(document.getElementById('gainInput').value);
  const gainDb = parseFloat(document.getElementById('gainDb').value);
  
  if (isNaN(inputValue) || isNaN(gainDb) || inputValue <= 0) {
    document.getElementById('gainResult-mW').textContent = '—';
    document.getElementById('gainResult-dBm').textContent = '—';
    return;
  }
  
  let inputMw;
  if (inputMode === 'mW') {
    inputMw = inputValue;
  } else {
    // V mode
    inputMw = (inputValue * inputValue) * 1000 / 50;
  }
  
  // Formula: Output mW = 10^((10 × log₁₀(输入mW) + 增益) / 10)
  const outputMw = Math.pow(10, (10 * Math.log10(inputMw) + gainDb) / 10);
  const outputDbm = 10 * Math.log10(outputMw);
  
  document.getElementById('gainResult-mW').textContent = outputMw.toFixed(6);
  document.getElementById('gainResult-dBm').textContent = outputDbm.toFixed(4);
}

// ========== Module 3: Cascade Link Calculator ==========
const DEVICES = {
  'Small Amp': 24,
  '2W Amp': 29,
  '5W Amp': 40,
  'Att 3dB': -3,
  'Att 10dB': -10,
  'Att 20dB': -20,
  'Splitter': -3
};

let deviceCount = {};

// Initialize device rows
function initDevices() {
  const container = document.getElementById('deviceRows');
  container.innerHTML = '';
  deviceCount = {};
  
  Object.keys(DEVICES).forEach(name => {
    deviceCount[name] = 0;
  });
  
  addDeviceRow();
}

function addDeviceRow() {
  const container = document.getElementById('deviceRows');
  const row = document.createElement('div');
  row.className = 'device-row';
  
  const select = document.createElement('select');
  select.onchange = () => updateDeviceCount();
  
  const optionDefault = document.createElement('option');
  optionDefault.value = '';
  optionDefault.textContent = 'Select device...';
  select.appendChild(optionDefault);
  
  Object.keys(DEVICES).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name + ' (' + (DEVICES[name] > 0 ? '+' : '') + DEVICES[name] + ' dB)';
    select.appendChild(opt);
  });
  
  const numInput = document.createElement('input');
  numInput.type = 'number';
  numInput.min = '0';
  numInput.max = '20';
  numInput.value = '0';
  numInput.placeholder = 'Qty';
  numInput.oninput = () => updateDeviceCount();
  
  row.appendChild(select);
  row.appendChild(numInput);
  container.appendChild(row);
  
  select.onchange = function() {
    updateDeviceCount();
  };
}

function updateDeviceCount() {
  const rows = document.querySelectorAll('.device-row');
  
  // Reset
  Object.keys(DEVICES).forEach(name => deviceCount[name] = 0);
  
  rows.forEach(row => {
    const select = row.querySelector('select');
    const input = row.querySelector('input');
    const name = select.value;
    const qty = parseInt(input.value) || 0;
    
    if (name && qty > 0) {
      deviceCount[name] = qty;
    }
  });
  
  calculateCascade();
}

function calculateCascade() {
  const inputMode = document.getElementById('cascadeInputMode').value;
  const inputValue = parseFloat(document.getElementById('cascadeInput').value);
  const linkLoss = parseFloat(document.getElementById('linkLoss').value) || 0;
  
  if (isNaN(inputValue) || inputValue <= 0) {
    clearCascadeResults();
    return;
  }
  
  // Convert to dBm
  let inputDbm;
  if (inputMode === 'dBm') {
    inputDbm = inputValue;
  } else {
    // mW mode
    inputDbm = 10 * Math.log10(inputValue);
  }
  
  // Calculate total gain
  let totalGain = 0;
  let breakdown = [];
  
  Object.keys(deviceCount).forEach(name => {
    if (deviceCount[name] > 0) {
      const gain = DEVICES[name] * deviceCount[name];
      totalGain += gain;
      breakdown.push(`${name} ×${deviceCount[name]} → ${gain > 0 ? '+' : ''}${gain} dB`);
    }
  });
  
  // Output calculation
  const outputDbm = inputDbm + totalGain - linkLoss;
  const outputMw = Math.pow(10, outputDbm / 10);
  
  // Update UI
  document.getElementById('cascadeOutput-mW').textContent = outputMw.toFixed(6);
  document.getElementById('cascadeOutput-dBm').textContent = outputDbm.toFixed(4);
  document.getElementById('cascadeNetGain').textContent = (totalGain - linkLoss).toFixed(1);
  
  // Breakdown
  const breakdownEl = document.getElementById('cascadeBreakdown');
  if (breakdown.length > 0) {
    breakdownEl.textContent = breakdown.join('\n');
    breakdownEl.style.display = 'block';
  } else {
    breakdownEl.style.display = 'none';
  }
}

function clearCascadeResults() {
  document.getElementById('cascadeOutput-mW').textContent = '—';
  document.getElementById('cascadeOutput-dBm').textContent = '—';
  document.getElementById('cascadeNetGain').textContent = '—';
  document.getElementById('cascadeBreakdown').style.display = 'none';
}

// Add device row via button
function addDevice() {
  addDeviceRow();
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initDevices();
  
  // Auto-calculate on input change
  document.getElementById('inputMode1').addEventListener('change', convertPower);
  document.getElementById('inputValue1').addEventListener('input', convertPower);
  
  document.getElementById('inputMode2').addEventListener('change', calculateGain);
  document.getElementById('gainInput').addEventListener('input', calculateGain);
  document.getElementById('gainDb').addEventListener('input', calculateGain);
  
  document.getElementById('cascadeInputMode').addEventListener('change', calculateCascade);
  document.getElementById('cascadeInput').addEventListener('input', calculateCascade);
  document.getElementById('linkLoss').addEventListener('input', calculateCascade);
});