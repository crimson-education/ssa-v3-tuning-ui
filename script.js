// ===============================
// Global parameters
// ===============================
const params = {
    difficulty: 0,              // 0–7
    majorCompetitiveness: 0,    // 0–2 (int)
    applyFinancialAid: false,   // checkbox
    isDomestic: true            // checkbox
};

const defaultParams = { ...params };

const paramConfig = {
    difficulty: { min: 0, max: 7, step: 1 },
    majorCompetitiveness: { min: 0, max: 2, step: 1 }
};

// ===============================
// Baseline storage
// ===============================
let baselineData = null;

// ===============================
// Styling helpers
// ===============================
const palette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
    '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
    '#bcbd22', '#17becf'
];

function getCurveStyle(key, idx) {
    const match = key.match(/A=(\d+),E=(\d+)/);
    let color = palette[idx % palette.length];
    let dash = 'solid';

    if (match) {
        const A = parseInt(match[1], 10);
        const E = parseInt(match[2], 10);
        if (A > E) dash = 'dash';
        else if (E > A) dash = 'dot';
    }

    return { color, dash };
}

// ===============================
// Plot
// ===============================
function updatePlot() {
    const traces = [];

    if (baselineData) {
        const diffKey = String(params.difficulty); // "0".."7"
        const curvesForDiff = baselineData[diffKey];

        if (curvesForDiff) {
            // Major competitiveness factor
            const competitivenessFactor = [1.0, 0.8, 0.6][params.majorCompetitiveness];

            Object.entries(curvesForDiff).forEach(([key, curve], idx) => {
                const { color, dash } = getCurveStyle(key, idx);

                let adjusted = curve.map(v => Number(v) * 100 * competitivenessFactor);

                // Financial aid impact (demo only)
                if (params.applyFinancialAid) {
                    const aidFactor = params.isDomestic ? 0.75 : 0.5; 
                    // 🔥 Simplified demo: 25% hit for domestic, 50% hit for international
                    adjusted = adjusted.map(p => p * aidFactor);
                }

                traces.push({
                    x: Array.from({ length: curve.length }, (_, i) => i + 1),
                    y: adjusted,
                    mode: 'lines',
                    name: `${key}`,
                    line: { width: 2, dash, color },
                    opacity: 0.95
                });
            });
        }
    }

    const layout = {
        title: `Admission Probability Curves 
                (Difficulty=${params.difficulty}, Major=${params.majorCompetitiveness},
                 Aid=${params.applyFinancialAid ? "On" : "Off"}, 
                 ${params.isDomestic ? "Domestic" : "International"})`,
        xaxis: {
            title: 'University Rank',
            range: [1, 50],
            fixedrange: false
        },
        yaxis: {
            title: 'Admission Probability (%)',
            range: [0, 100],
            fixedrange: true
        },
        legend: { orientation: 'h', y: -0.3, x: 0.5, xanchor: 'center' },
        margin: { b: 120, t: 50, l: 70, r: 30 },
        dragmode: 'pan',
        annotations: [{
            text: "⚠️ Demonstration assumes perfect visibility of financial aid awareness. Not true for each university in practice.",
            showarrow: false,
            xref: "paper",
            yref: "paper",
            x: 0,
            y: -0.25,
            xanchor: "left",
            yanchor: "top",
            font: { size: 12, color: "red" }
        }]
    };

    Plotly.react("plotDiv", traces, layout, { scrollZoom: true });
}

// ===============================
// Parameter Controls (UI)
// ===============================
function toLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function buildSliders() {
    const panel = document.querySelector('.controls-panel');
    panel.innerHTML = '<h3 style="margin-top:0; text-align:center; color:#2c3e50;">Parameter Controls</h3>';

    // Add sliders
    Object.entries(paramConfig).forEach(([key, cfg]) => {
        const group = document.createElement('div');
        group.className = 'slider-group';
        group.innerHTML = `
            <label for="${key}">${toLabel(key)}</label>
            <input type="range" id="${key}" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${params[key]}">
            <input type="number" id="${key}-val" step="${cfg.step}" value="${params[key]}">
        `;
        panel.appendChild(group);

        const slider = group.querySelector(`#${key}`);
        const valueInput = group.querySelector(`#${key}-val`);
        const fmt = cfg.step < 1 ? 2 : 0;
        valueInput.value = Number(params[key]).toFixed(fmt);

        slider.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            params[key] = val;
            valueInput.value = val.toFixed(fmt);
            updateParameterDisplay();
            updatePlot();
        });

        valueInput.addEventListener('change', e => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) return;
            val = Math.max(cfg.min, Math.min(cfg.max, val));
            params[key] = val;
            slider.value = val;
            valueInput.value = val.toFixed(fmt);
            updateParameterDisplay();
            updatePlot();
        });
    });

    // Add financial aid checkbox
    const aidGroup = document.createElement('div');
    aidGroup.className = 'slider-group';
    aidGroup.innerHTML = `
        <label><input type="checkbox" id="applyFinancialAid"> Apply Financial Aid Impact</label>
    `;
    panel.appendChild(aidGroup);

    const aidCheckbox = aidGroup.querySelector('#applyFinancialAid');
    aidCheckbox.checked = params.applyFinancialAid;
    aidCheckbox.addEventListener('change', e => {
        params.applyFinancialAid = e.target.checked;
        updateParameterDisplay();
        updatePlot();
    });

    // Add domestic/international checkbox
    const domGroup = document.createElement('div');
    domGroup.className = 'slider-group';
    domGroup.innerHTML = `
        <label><input type="checkbox" id="isDomestic"> Domestic Applicant</label>
    `;
    panel.appendChild(domGroup);

    const domCheckbox = domGroup.querySelector('#isDomestic');
    domCheckbox.checked = params.isDomestic;
    domCheckbox.addEventListener('change', e => {
        params.isDomestic = e.target.checked;
        updateParameterDisplay();
        updatePlot();
    });

    if (!document.getElementById('current-params')) {
        const pd = document.createElement('div');
        pd.id = 'current-params';
        panel.appendChild(pd);
    }
    updateParameterDisplay();
}

function updateParameterDisplay() {
    const display = document.getElementById('current-params');
    display.innerHTML = `
        Difficulty: ${params.difficulty} | 
        Major Competitiveness: ${params.majorCompetitiveness} | 
        Aid Impact: ${params.applyFinancialAid ? "Yes" : "No"} | 
        Applicant: ${params.isDomestic ? "Domestic" : "International"}
    `;
}

// ===============================
// Baseline loader
// ===============================
async function loadBaselineData() {
    try {
        const resp = await fetch("baseline_curves.json");
        baselineData = await resp.json();
        console.log("✅ Baseline data loaded", baselineData);
        updatePlot();
    } catch (err) {
        console.error("❌ Error loading baseline data:", err);
    }
}

// ===============================
// Init
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    buildSliders();
    loadBaselineData();
    updatePlot();
    console.log("🎓 Admission Predictor ready (Difficulty + Major + Aid + Domestic toggles)");
});
