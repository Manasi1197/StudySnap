# Demo Notes for Tavus Video Generation Testing

## 📚 Sample Educational Content for Testing

### Biology - Cell Structure and Function

**Topic: Cellular Biology Fundamentals**

Cells are the basic units of life and the building blocks of all living organisms. Understanding cellular structure and function is fundamental to biology and provides the foundation for more advanced topics in genetics, physiology, and biochemistry.

**Cell Theory:**
The cell theory consists of three main principles:
1. All living things are composed of one or more cells
2. The cell is the basic unit of life
3. All cells arise from pre-existing cells

**Major Cell Components:**

**Cell Membrane (Plasma Membrane):**
The cell membrane is a selectively permeable barrier that controls what enters and exits the cell. It consists of a phospholipid bilayer with embedded proteins that facilitate transport and communication.

**Nucleus:**
The nucleus is the control center of the cell, containing the cell's DNA. It regulates gene expression and coordinates protein synthesis, cell growth, and reproduction. The nuclear envelope surrounds the nucleus and contains nuclear pores for molecular transport.

**Mitochondria:**
Known as the "powerhouses of the cell," mitochondria are responsible for cellular respiration and ATP production. They have their own DNA and can reproduce independently within the cell.

**Endoplasmic Reticulum (ER):**
- Rough ER: Studded with ribosomes, responsible for protein synthesis and modification
- Smooth ER: Lacks ribosomes, involved in lipid synthesis and detoxification

**Golgi Apparatus:**
The Golgi apparatus processes, modifies, and packages proteins received from the rough ER. It acts like a cellular post office, sorting and shipping proteins to their final destinations.

**Ribosomes:**
These small structures are responsible for protein synthesis. They can be found free in the cytoplasm or attached to the rough ER.

**Lysosomes:**
Often called the "digestive system" of the cell, lysosomes contain enzymes that break down waste materials, cellular debris, and foreign substances.

**Cytoplasm:**
The gel-like substance that fills the cell and provides a medium for cellular organelles to move and function.

**Cell Processes:**

**Cellular Respiration:**
The process by which cells break down glucose to produce ATP (adenosine triphosphate), the cell's energy currency. This occurs primarily in the mitochondria through glycolysis, the Krebs cycle, and the electron transport chain.

**Protein Synthesis:**
The process of creating proteins from amino acids, involving transcription (DNA to RNA) and translation (RNA to protein).

**Cell Division:**
The process by which cells reproduce, including mitosis (for growth and repair) and meiosis (for sexual reproduction).

**Transport Mechanisms:**
- Passive transport: Movement without energy (diffusion, osmosis)
- Active transport: Movement requiring energy (sodium-potassium pump)
- Endocytosis and exocytosis: Bulk transport of materials

**Cellular Communication:**
Cells communicate through chemical signals, including hormones, neurotransmitters, and other signaling molecules that bind to specific receptors.

**Homeostasis:**
The ability of cells to maintain stable internal conditions despite changes in the external environment.

This foundational knowledge of cellular biology is essential for understanding how life functions at the most basic level and provides the groundwork for studying more complex biological systems and processes.

---

## 🧪 Testing Instructions

### Step 1: Upload Content
1. Go to Quiz Generator
2. Paste the above content into the text area
3. Verify content length indicator shows sufficient words

### Step 2: Test API Key
1. Click "Test Tavus API" button
2. Verify API key validation works
3. If key is invalid, test the API Key Manager modal

### Step 3: Generate Quiz
1. Click "Generate Quiz with AI" 
2. Wait for mock quiz generation
3. Verify quiz overview page appears

### Step 4: Test Video Generation
1. Click "Generate Video" on the AI Video card
2. Monitor progress indicators
3. Verify video generation completes
4. Test navigation to video player

### Step 5: Test Navigation
1. Test switching between Video, Flashcards, and Quiz
2. Verify data persistence across views
3. Test back navigation to overview

### Expected Results:
- ✅ API key validation works
- ✅ Video generation initiates successfully  
- ✅ Progress tracking shows updates
- ✅ Video URL is returned and playable
- ✅ Navigation between views works seamlessly
- ✅ Error handling for expired keys works

### Error Testing:
1. Test with invalid API key
2. Test network disconnection
3. Test API rate limiting scenarios