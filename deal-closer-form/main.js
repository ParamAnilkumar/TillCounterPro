import './style.css';

document.addEventListener('DOMContentLoaded', () => {
  const steps = document.querySelectorAll('.form-step');
  const nextBtns = document.querySelectorAll('.next-btn');
  const prevBtns = document.querySelectorAll('.prev-btn');
  const form = document.getElementById('deal-form');
  
  // Camera Elements
  const videoElement = document.getElementById('videoElement');
  const canvasElement = document.getElementById('canvasElement');
  const imagePreview = document.getElementById('imagePreview');
  const capturedImage = document.getElementById('capturedImage');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const captureBtn = document.getElementById('captureBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  
  let currentStep = 1;
  let videoStream = null;
  let capturedImageData = null;

  // Form Navigation
  function updateSteps(stepNumber) {
    steps.forEach(step => {
      step.classList.remove('active');
    });
    
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
      targetStep.classList.add('active');
    }
    
    // Update Stepper UI
    if (stepNumber <= 3 || stepNumber === 'success') {
        const num = stepNumber === 'success' ? 4 : stepNumber;
        for (let i = 1; i <= 3; i++) {
          const indicator = document.getElementById(`indicator-${i}`);
          if (indicator) {
              if (i < num) {
                indicator.classList.remove('active');
                indicator.classList.add('completed');
              } else if (i === num) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
              } else {
                indicator.classList.remove('active', 'completed');
              }
          }
        }
        
        // Update lines
        const lines = document.querySelectorAll('.step-line');
        lines.forEach((line, idx) => {
            if (idx + 1 < num) {
                line.classList.add('active');
            } else {
                line.classList.remove('active');
            }
        });
    }

    currentStep = stepNumber;
    
    // Stop camera if moving away from step 2
    if (currentStep !== 2 && videoStream) {
      stopCamera();
    }
  }

  // Validate inputs before moving next
  function validateStep(stepId) {
    const stepEl = document.getElementById(stepId);
    if (!stepEl) return true;
    
    const inputs = stepEl.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        input.reportValidity();
        isValid = false;
      }
    });
    return isValid;
  }

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(`step-${currentStep}`)) {
        const nextStep = parseInt(btn.getAttribute('data-next'));
        updateSteps(nextStep);
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prevStep = parseInt(btn.getAttribute('data-prev'));
      updateSteps(prevStep);
    });
  });

  // Camera Logic
  async function startCamera() {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      videoElement.srcObject = videoStream;
      videoElement.style.display = 'block';
      imagePreview.style.display = 'none';
      
      startCameraBtn.style.display = 'none';
      captureBtn.style.display = 'inline-block';
      retakeBtn.style.display = 'none';
      capturedImageData = null;
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions or skip this step.");
    }
  }

  function stopCamera() {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
  }

  startCameraBtn.addEventListener('click', startCamera);

  captureBtn.addEventListener('click', () => {
    if (!videoElement.videoWidth) return;
    
    // Set canvas dimensions to match video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // Draw current frame to canvas
    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Get image data URL
    capturedImageData = canvasElement.toDataURL('image/png');
    capturedImage.src = capturedImageData;
    
    // Update UI
    videoElement.style.display = 'none';
    imagePreview.style.display = 'block';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';
    
    stopCamera();
  });

  retakeBtn.addEventListener('click', startCamera);

  // Final Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validateStep('step-3')) {
      const submitBtn = document.getElementById('submitBtn');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;

      try {
        // Gather all data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Add the captured image if available
        if (capturedImageData) {
          data.governmentIdImage = capturedImageData;
        }
        
        // Use environment variable for API URL or fallback to localhost
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/deal-closer';

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log('Form Submitted successfully:', result);
          // Transition to success state
          updateSteps('success');
          document.querySelector('.stepper').style.display = 'none';
        } else {
          throw new Error(result.message || 'Failed to submit');
        }
      } catch (error) {
        console.error('Submission error:', error);
        alert('There was an error submitting your form. Please check your backend connection.');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }
  });
});
