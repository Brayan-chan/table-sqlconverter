import { GoogleGenerativeAI } from "@google/generative-ai";
        
        // Dark mode detection
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });
        
        // Elements
        const apiKeyInput = document.getElementById('apiKey');
        const toggleApiKeyBtn = document.getElementById('toggleApiKey');
        const saveApiKeyBtn = document.getElementById('saveApiKey');
        const apiKeySection = document.getElementById('apiKeySection');
        const fileInput = document.getElementById('fileInput');
        const tableNameInput = document.getElementById('tableName');
        const toggleInstructionsBtn = document.getElementById('toggleInstructions');
        const customInstructionsContainer = document.getElementById('customInstructionsContainer');
        const customInstructionsInput = document.getElementById('customInstructions');
        const modifyInstructionsInput = document.getElementById('modifyInstructions');
        const regenerateButton = document.getElementById('regenerateButton');
        const processButton = document.getElementById('processButton');
        const imagePreview = document.getElementById('imagePreview');
        const loadingContainer = document.getElementById('loadingContainer');
        const resultContainer = document.getElementById('resultContainer');
        const sqlOutput = document.getElementById('sqlOutput');
        const copyButton = document.getElementById('copyButton');
        const newImageButton = document.getElementById('newImageButton');
        const errorContainer = document.getElementById('errorContainer');
        const errorMessage = document.getElementById('errorMessage');
        
        // Initial state
        processButton.disabled = true;
        let geminiModel = null;
        let lastProcessedImage = null;
        
        // Toggle custom instructions
        toggleInstructionsBtn.addEventListener('click', () => {
            const isVisible = customInstructionsContainer.classList.contains('visible');
            if (isVisible) {
                customInstructionsContainer.classList.remove('visible');
                toggleInstructionsBtn.textContent = 'Mostrar opciones avanzadas';
            } else {
                customInstructionsContainer.classList.add('visible');
                toggleInstructionsBtn.textContent = 'Ocultar opciones avanzadas';
            }
        });
        
        // Check for saved API key
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            try {
                initializeGemini(savedApiKey);
                apiKeySection.classList.add('hidden');
            } catch (error) {
                showError("Error al inicializar la API de Gemini: " + error.message);
                localStorage.removeItem('gemini_api_key');
            }
        }
        
        // Toggle API key visibility
        toggleApiKeyBtn.addEventListener('click', () => {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                toggleApiKeyBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                `;
            } else {
                apiKeyInput.type = 'password';
                toggleApiKeyBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                `;
            }
        });
        
        // Save API key
        saveApiKeyBtn.addEventListener('click', () => {
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                showError('Por favor ingresa una clave API válida');
                return;
            }
            
            try {
                initializeGemini(apiKey);
                localStorage.setItem('gemini_api_key', apiKey);
                apiKeySection.classList.add('hidden');
            } catch (error) {
                showError("Error al inicializar la API de Gemini: " + error.message);
            }
        });
        
        // Initialize Gemini client
        function initializeGemini(apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                // Cambia la inicialización del modelo si es necesario
                geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                processButton.disabled = !fileInput.files.length;
            } catch (error) {
                console.error("Error inicializando Gemini:", error);
                throw new Error("Clave API inválida o error de inicialización");
            }
        }
        
        // Handle file input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    imagePreview.innerHTML = `<img src="${event.target.result}" alt="Imagen de Tabla" class="rounded-md shadow-sm">`;
                    imagePreview.classList.remove('hidden');
                    processButton.disabled = geminiModel === null;
                    
                    // Suggest table name from filename
                    if (!tableNameInput.value) {
                        const fileName = file.name.split('.')[0];
                        tableNameInput.value = fileName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
                    }
                };
                
                reader.readAsDataURL(file);
            }
        });
        
        // Handle process button click
        processButton.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) {
                showError('Por favor selecciona una imagen');
                return;
            }
            
            await processImage(file);
        });
        
        // Handle regenerate button click
        regenerateButton.addEventListener('click', async () => {
            const instructions = modifyInstructionsInput.value.trim();
            if (!instructions) {
                showError('Por favor ingresa instrucciones para la modificación del SQL');
                return;
            }
            
            if (!lastProcessedImage) {
                showError('No hay una imagen procesada para regenerar SQL');
                return;
            }
            
            await processImage(lastProcessedImage, instructions);
        });
        
        
        // Actualizar el método de generación de contenido en processImage
        async function processImage(file, modifyInstructions = null) {
            const tableName = tableNameInput.value.trim() || 'tabla_extraida';
            const customInstructions = modifyInstructions || customInstructionsInput.value.trim();
        
            if (!geminiModel) {
                apiKeySection.classList.remove('hidden');
                showError('Por favor ingresa una clave API de Gemini válida');
                return;
            }
        
            lastProcessedImage = file;
        
            loadingContainer.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            errorContainer.classList.add('hidden');
            processButton.disabled = true;
            if (regenerateButton) regenerateButton.disabled = true;
        
            try {
                const base64Image = await fileToGenerativePart(file);
        
                let prompt = `
                Tengo una imagen de una tabla con datos. Por favor:
        
                1. Identifica todas las columnas en la tabla
                2. Extrae todos los datos de las filas de la tabla
                3. Determina los tipos de datos apropiados para cada columna (VARCHAR, INT, DECIMAL, DATE, etc.)
                4. Genera código SQL que cree una tabla llamada "${tableName}" e inserte todos los datos
        
                Devuelve tu respuesta en este formato:
                
                \`\`\`sql
                -- Tus declaraciones SQL CREATE TABLE e INSERT aquí
                \`\`\`
        
                Asegúrate de que los nombres de las columnas sean compatibles con SQL (minúsculas, sin espacios, usa guiones bajos).
                Considera los patrones de datos al determinar los tipos de datos.
                Usa la sintaxis SQL adecuada para crear tablas e insertar datos.
                `;
        
                if (customInstructions) {
                    prompt += `\n\nInstrucciones adicionales: ${customInstructions}`;
                }
        
                // Genera contenido con el modelo actualizado
                const result = await geminiModel.generateContent([prompt, base64Image]);
                const response = await result.response;
                const text = await response.text();
        
                const sqlMatch = text.match(/```sql\s*([\s\S]*?)\s*```/);
                if (sqlMatch && sqlMatch[1]) {
                    sqlOutput.textContent = sqlMatch[1].trim();
                } else {
                    sqlOutput.textContent = text.trim();
                }
        
                loadingContainer.classList.add('hidden');
                resultContainer.classList.remove('hidden');
            } catch (error) {
                console.error("Error llamando a la API de Gemini:", error);
                loadingContainer.classList.add('hidden');
                showError("Error al procesar la imagen: " + error.message);
            } finally {
                processButton.disabled = false;
                if (regenerateButton) regenerateButton.disabled = false;
            }
        }
        
        // Convert file to Gemini-compatible format
        async function fileToGenerativePart(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Data = reader.result.split(',')[1];
                    const mimeType = file.type;
                    
                    resolve({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        // Copy button
        copyButton.addEventListener('click', () => {
            const sqlText = sqlOutput.textContent;
            navigator.clipboard.writeText(sqlText)
                .then(() => {
                    copyButton.textContent = '¡Copiado!';
                    setTimeout(() => {
                        copyButton.textContent = 'Copiar SQL';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Error al copiar texto: ', err);
                });
        });
        
        // New image button
        newImageButton.addEventListener('click', () => {
            fileInput.value = '';
            imagePreview.innerHTML = '';
            imagePreview.classList.add('hidden');
            resultContainer.classList.add('hidden');
            processButton.disabled = true;
            lastProcessedImage = null;
            fileInput.click();
        });
        
        // Helper to show error
        function showError(message) {
            errorMessage.textContent = message;
            errorContainer.classList.remove('hidden');
            loadingContainer.classList.add('hidden');
        }