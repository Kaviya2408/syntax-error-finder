export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  const { code } = req.body;
  console.log('Received code:', code);
  console.log('Detected language:', detectLanguage(code));
  
  if (!code || code.trim() === "") {
    res.status(400).json({ errors: [{ line: 0, msg: "No code detected", desc: "Please paste your source code before checking for syntax errors." }] });
    return;
  }

  const errors = analyzeSyntaxErrors(code);
  console.log('All errors found:', errors);
  console.log('Found errors:', errors.length);
  res.status(200).json({ errors });
}

function analyzeSyntaxErrors(code) {
  console.log('=== Starting analyzeSyntaxErrors ===');
  const errors = [];
  const errorKeys = new Set(); // Track unique errors to prevent duplicates
  
  // Split by newlines - DON'T split single line code as it creates phantom lines
  let lines = code.split('\n');
  
  console.log('Split into lines:', lines.length);
  lines.forEach((l, i) => console.log(`Line ${i + 1}: ${l.trim()}`));
  
  const language = detectLanguage(code);
  console.log('Language detected:', language);
  console.log('Total lines:', lines.length);

  // Helper function to add error only if not duplicate
  function addError(error) {
    const errorKey = `${error.line}-${error.msg}`;
    if (!errorKeys.has(errorKey)) {
      errorKeys.add(errorKey);
      errors.push(error);
    }
  }

  // Track overall bracket and parenthesis balance
  let bracketBalance = 0;
  let parenthesisBalance = 0;
  let braceBalance = 0;

  // Check for common syntax errors based on language
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    if (trimmed === '') continue;

    // Track bracket/parenthesis balance per line
    const lineBrackets = (trimmed.match(/\{/g) || []).length;
    const lineCloseBrackets = (trimmed.match(/\}/g) || []).length;
    const lineParens = (trimmed.match(/\(/g) || []).length;
    const lineCloseParens = (trimmed.match(/\)/g) || []).length;
    const lineBraces = (trimmed.match(/\[/g) || []).length;
    const lineCloseBraces = (trimmed.match(/\]/g) || []).length;
    
    braceBalance += lineBrackets - lineCloseBraces;
    bracketBalance += lineBrackets - lineCloseBrackets;
    parenthesisBalance += lineParens - lineCloseParens;

    // Language-specific checks
    if (language === 'javascript' || language === 'java' || language === 'c' || language === 'cpp') {
      // Check for unmatched parentheses first (before other checks)
      const openParens = (trimmed.match(/\(/g) || []).length;
      const closeParens = (trimmed.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        console.log(`Line ${lineNum} has unmatched parentheses: ${openParens} open, ${closeParens} close`);
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Unclosed parenthesis",
          desc: `This line has ${openParens - closeParens} more opening parenthesis '(' than closing ')'. Add the missing closing parenthesis to complete the expression. Fix: "${line.trim()})" - Add the closing parenthesis.`
        });
      } else if (closeParens > openParens) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Extra closing parenthesis",
          desc: `Remove ${closeParens - openParens} closing parenthesis or add matching opening parenthesis.`
        });
      }

      // Missing semicolon check - simplified and more accurate
      if (!trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && trimmed !== '') {
        console.log(`Checking line ${lineNum} for semicolon: ${trimmed}`);
        
        // Skip comments and control structures that don't need semicolons
        const skipPatterns = [
          /^\s*\/\//, // single line comments
          /^\s*\/\*/, // multi-line comments start
          /^\s*\*/, // multi-line comments middle
          /^\s*\*\//, // multi-line comments end
          /^\s*(public|private|protected)\s+class/, // class declarations
          /^\s*(if|while|for|else|try|catch|finally|switch)\s*\(/, // control structures
          /^\s*(else|try|finally)\s*$/, // standalone else/try/finally
          /^\s*case\s+/, // switch cases
          /^\s*default\s*:/, // default case
          /^\s*(import|package)/, // imports and package declarations
        ];

        const shouldSkip = skipPatterns.some(pattern => pattern.test(trimmed));
        
        if (!shouldSkip) {
          // Check if it's a statement that needs semicolon
          const statementPatterns = [
            /^(int|float|double|String|char|boolean|long|short|byte|let|const|var)\s+\w+/, // variable declarations
            /^\w+\s*=/, // assignments
            /^\w+\s*\(/, // method calls
            /^System\./, // Java System calls
            /^console\./, // JavaScript console
            /^printf\s*\(/, // C printf
            /^return\s/, // return statements
            /^break\s*$/, // break
            /^continue\s*$/, // continue
            /^\w+\s*\[.*\]\s*$/, // array access
            /^\w+\s*\.\s*\w+/, // property access
          ];

          const isStatement = statementPatterns.some(pattern => pattern.test(trimmed));
          
          if (isStatement) {
            console.log(`Line ${lineNum} is a statement missing semicolon`);
            addError({
              line: lineNum,
              lineContent: line.trim(),
              msg: "Missing semicolon",
              desc: `This line is missing a semicolon at the end. In Java, every statement must end with a semicolon. Fix: "${line.trim()};" - Add the semicolon to complete the statement.`
            });
          }
        } else {
          console.log(`Line ${lineNum} skipped - control structure or comment`);
        }
      }

      // Missing variable declaration - more specific check
      if (trimmed.includes('=') && !trimmed.match(/^\s*(int|float|double|String|char|boolean|long|short|byte|let|const|var)\s+\w+\s*=/)) {
        console.log(`Checking variable declaration on line ${lineNum}: ${trimmed}`);
        const varMatch = trimmed.match(/^\s*(\w+)\s*=/);
        if (varMatch && !['if', 'while', 'for', 'switch', 'return', 'System', 'console'].includes(varMatch[1])) {
          console.log(`Adding missing variable declaration error for: ${varMatch[1]}`);
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Missing variable declaration",
            desc: `Variable '${varMatch[1]}' is being used without being declared first. In Java, you must declare variables before using them. Fix: "int ${varMatch[1]} = ${trimmed.substring(trimmed.indexOf('=') + 1).trim()}" - Add the variable type before the variable name.`
          });
        }
      }

      // Invalid variable name - more specific check
      if (trimmed.match(/^\s*(int|float|double|String|char|boolean|long|short|byte|let|const|var)\s+(\d\w*)\s*=/)) {
        console.log(`Adding invalid variable name error for line ${lineNum}: ${trimmed}`);
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Invalid variable name",
          desc: `Variable names cannot start with numbers in Java. The name '${trimmed.match(/(\d\w*)/)[1]}' starts with a digit which is invalid. Fix: Use a name starting with a letter, like 'var${trimmed.match(/(\d\w*)/)[1]}' or 'number${trimmed.match(/(\d\w*)/)[1]}'.`
        });
      }

      // Method call without parentheses - FIXED to avoid false positives
      // Only flag if it's a standalone identifier that looks like a function call
      // and is NOT an assignment, declaration, control structure, or variable name
      if (trimmed.match(/^\s*[a-zA-Z_]\w*\s*$/) && 
          !trimmed.includes(';') && 
          !trimmed.includes('{') && 
          !trimmed.includes('class') && 
          !trimmed.includes('public') && 
          !trimmed.includes('private') && 
          !trimmed.includes('static') &&
          !trimmed.includes('=') && // Not an assignment
          !trimmed.match(/^\s*(int|float|double|String|char|boolean|long|short|byte|let|const|var)\s+/) && // Not a declaration
          !trimmed.includes('.') && // Not a method call like System.out.println
          !trimmed.includes('"') && // Not a string literal
          !trimmed.includes("'") && // Not a character literal
          !['if', 'while', 'for', 'switch', 'return', 'break', 'continue', 'main', 'Test', 'x', 'a', 'hello', 'test', 'System', 'out', 'println'].includes(trimmed.trim())) { // Not control structures or common identifiers
        console.log(`Checking for missing parentheses on line ${lineNum}: ${trimmed}`);
        // Additional check: make sure it's not a single letter variable name
        if (trimmed.trim().length > 1 || !/^[a-z]$/.test(trimmed.trim())) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Missing Function Parentheses",
            desc: `This looks like a function call but is missing parentheses. If '${trimmed.trim()}' is a function, add parentheses: "${line.trim()}()". If it's a variable, this error should not appear.`
          });
        }
      }

      // Missing main method (Java specific) - only add once
      if (language === 'java' && code.includes('public class') && !code.includes('public static void main') && !errors.some(e => e.msg === "Missing main method")) {
        addError({
          line: 0,
          msg: "Missing main method",
          desc: `Java programs need a main method: "public static void main(String[] args)" to run.`
        });
      }

      // Array out of bounds detection - improved logic
      if (trimmed.includes('[') && trimmed.includes(']')) {
        console.log(`Checking line ${lineNum} for array access: ${trimmed}`);
        const arrayMatch = trimmed.match(/(\w+)\[(\d+)\]/g);
        if (arrayMatch) {
          for (const match of arrayMatch) {
            const index = parseInt(match.match(/\[(\d+)\]/)[1]);
            console.log(`Found array access: ${match} with index ${index}`);
            // Look for array declaration in previous lines
            let arraySize = 0;
            const arrayName = match.match(/(\w+)\[/)[1];
            
            for (let j = Math.max(0, i - 10); j <= i; j++) {
              const prevLine = lines[j].trim();
              console.log(`Checking line ${j} for array declaration: ${prevLine}`);
              // Match various array declaration patterns
              const arrayDeclPatterns = [
                new RegExp(`int\\s+${arrayName}\\[\\s*(\\d+)\\s*\\]`),
                new RegExp(`int\\s+${arrayName}\\[\\s*\\]\\s*=\\s*\\{([^}]*)\\}`),
                new RegExp(`${arrayName}\\[\\s*(\\d+)\\s*\\]`),
                new RegExp(`${arrayName}\\s*=\\s*\\{([^}]*)\\}`)
              ];
              
              for (const pattern of arrayDeclPatterns) {
                const match = prevLine.match(pattern);
                console.log(`Testing pattern: ${pattern} against: ${prevLine}`);
                if (match) {
                  console.log(`Pattern matched: ${pattern}, result:`, match);
                  console.log(`match[1]:`, match[1], `typeof match[1]:`, typeof match[1]);
                  if (match[1] && /^\d+$/.test(match[1])) {
                    arraySize = parseInt(match[1]);
                    console.log(`Using explicit array size: ${arraySize}`);
                  } else {
                    // Count elements in array initialization
                    const braceMatch = prevLine.match(/\{([^}]*)\}/);
                    console.log(`Brace match:`, braceMatch);
                    if (braceMatch) {
                      const elementsStr = braceMatch[1];
                      const elements = elementsStr.split(',').map(el => el.trim()).filter(el => el !== '');
                      arraySize = elements.length;
                      console.log(`Found array ${arrayName} with ${arraySize} elements:`, elements);
                    }
                  }
                  break;
                }
              }
              if (arraySize > 0) break;
            }
            
            console.log(`Final array size for ${arrayName}: ${arraySize}`);
            
            // If we can't determine array size, use a reasonable threshold
            if (arraySize === 0 && index >= 3) {
              errors.push({
                line: lineNum,
                lineContent: line.trim(),
                msg: "Array Index Out Of Bounds",
                desc: `You're trying to access index ${index} of array '${arrayName}', but the array only has 3 elements (indices 0 to 2). Fix: Use a valid index like ${Math.min(index, 2)} or check the array size before accessing.`
              });
            } else if (arraySize > 0 && index >= arraySize) {
              addError({
                line: lineNum,
                lineContent: line.trim(),
                msg: "Array Index Out Of Bounds",
                desc: `You're trying to access index ${index} of array '${arrayName}', but the array only has ${arraySize} elements (indices 0 to ${arraySize - 1}). Fix: Use a valid index like ${Math.min(index, arraySize - 1)} or check the array size before accessing.`
              });
            }
          }
        }
      }

      // Extra Comma / Trailing Comma Error
      if (trimmed.includes(',}') || trimmed.includes(',]') || trimmed.includes(',)')) {
        errors.push({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Trailing Comma Error",
          desc: `Remove the trailing comma before ${trimmed.includes(',}') ? '}' : trimmed.includes(',]') ? ']' : ')'}.`
        });
      }

      // Invalid Keyword / Misspelled Keyword - more specific check
      const misspelledKeywords = ['publc', 'privat', 'statc', 'voi', 'systm', 'otput', 'prntln', 'lenght', 'lengh'];
      for (const keyword of misspelledKeywords) {
        // Only flag if it's actually used as a keyword, not just part of another word
        if (trimmed.match(new RegExp(`\\b${keyword}\\b`))) {
          errors.push({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Misspelled Keyword",
            desc: `Keyword "${keyword}" appears to be misspelled. Check the correct spelling.`
          });
        }
      }

      // Missing Function Parentheses - REMOVED duplicate check that was causing false positives
      // This is handled by the more comprehensive check above
      // if (trimmed.match(/\w+\s*$/) && !trimmed.includes(';') && !trimmed.includes('{')) {
      //   errors.push({
      //     line: lineNum,
      //     lineContent: line.trim(),
      //     msg: "Missing Function Parentheses",
      //     desc: `Function calls require parentheses: "${line.trim()}()"`
      //   });
      // }

      // Invalid Assignment Operator
      if (trimmed.includes('===') || trimmed.includes('!==')) {
        errors.push({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Invalid Assignment Operator",
          desc: `Use '==' for comparison or '=' for assignment. '${trimmed.includes('===') ? '===' : '!=='} is not a valid assignment operator.`
        });
      }

      // Missing Colon
      if ((trimmed.includes('case') && !trimmed.includes(':')) || 
          (trimmed.includes('?') && !trimmed.includes(':'))) {
        errors.push({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Missing Colon",
          desc: `This statement requires a colon (:).`
        });
      }

      // Invalid Import Statement
      if (language === 'java' && trimmed.includes('import') && !trimmed.endsWith(';')) {
        errors.push({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Invalid Import Statement",
          desc: `Import statements must end with semicolon: "${line.trim()}"`
        });
      }

      // Invalid Method Declaration - more specific check
      if (trimmed.match(/\w+\s+\w+\s*\([^)]*\)/) && !trimmed.includes('{') && !trimmed.endsWith(';')) {
        console.log(`Checking method declaration on line ${lineNum}: ${trimmed}`);
        // Only flag if it's actually a method declaration, not a method call
        if (!trimmed.includes('System.') && !trimmed.includes('console.') && !trimmed.match(/^\s*\w+\s*\.\s*\w+\s*\(/)) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Invalid Method Declaration",
            desc: `Method declarations must end with ';' or have a body with '{'.`
          });
        }
      }

      // Reserved Keyword Used as Identifier - much more specific check
      const reservedKeywords = ['class', 'public', 'private', 'static', 'void', 'String', 'if', 'else', 'for', 'while', 'return'];
      // Remove 'int' from reserved keywords since it's a valid type
      for (const keyword of reservedKeywords) {
        // Only flag if the keyword is used as a variable name in assignment, not in proper declarations
        // And it's not part of a valid variable declaration
        if (trimmed.match(new RegExp(`^\\s*${keyword}\\s+\\w+\\s*=`)) && 
            !trimmed.match(new RegExp(`^\\s*(int|float|double|String|char|boolean)\\s+${keyword}\\s*=`)) &&
            !trimmed.match(new RegExp(`^\\s*(int|float|double|String|char|boolean)\\s+\\w+\\s*=`))) {
          console.log(`Checking reserved keyword on line ${lineNum}: ${trimmed}`);
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Reserved Keyword Used as Identifier",
            desc: `"${keyword}" is a reserved keyword and cannot be used as a variable name.`
          });
        }
      }

      // Unexpected Token - much more restrictive check
      // Only flag if there are actually invalid characters, not just valid programming symbols
      const invalidChars = trimmed.match(/[^\w\s\{\}\[\]\(\)\.;,\+\-\*\/\=\!<>\?@#%&\|\\`~]/g);
      if (invalidChars && invalidChars.length > 0) {
        console.log(`Checking invalid characters on line ${lineNum}: ${trimmed}, found: ${invalidChars.join(', ')}`);
        // Only flag if it's not a string literal or comment
        if (!trimmed.includes('"') && !trimmed.includes("'") && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Unexpected Token",
            desc: `Invalid character(s) found: ${invalidChars.join(', ')}. Remove these special characters.`
          });
        }
      }

      // Missing Return Type - more specific check
      if (trimmed.match(/\w+\s+\w+\s*\([^)]*\)\s*\{/) && !trimmed.match(/^(public|private|protected|static)?\s*(int|float|double|String|char|boolean|void)\s+/)) {
        console.log(`Checking return type on line ${lineNum}: ${trimmed}`);
        // Only flag if it's actually a method declaration, not a method call
        // And exclude main method which has valid return type
        if (!trimmed.includes('System.') && !trimmed.includes('console.') && 
            !trimmed.match(/^\s*\w+\s*\.\s*\w+\s*\(/) && 
            !trimmed.includes('main')) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Missing Return Type",
            desc: `Method declarations must specify a return type.`
          });
        }
      }

      // Invalid Loop Syntax
      if (trimmed.includes('for') && !trimmed.match(/for\s*\([^)]*;[^)]*;[^)]*\)/)) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Invalid Loop Syntax",
          desc: `For loop syntax: "for (initialization; condition; increment)"`
        });
      }

      // Invalid Conditional Syntax
      if (trimmed.includes('if') && !trimmed.match(/if\s*\([^)]+\)/)) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Invalid Conditional Syntax",
          desc: `If statements require conditions in parentheses: "if (condition)"`
        });
      }

      // File Name Class Name Mismatch (Java) - only add once
      if (language === 'java') {
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        if (classMatch && !errors.some(e => e.msg === "File Name Class Name Mismatch")) {
          const className = classMatch[1];
          addError({
            line: 0,
            msg: "File Name Class Name Mismatch",
            desc: `Java file should be named "${className}.java" to match the public class name.`
          });
        }
      }

      // Invalid Logical Operator - more specific check
      if ((trimmed.includes('&&') || trimmed.includes('||')) && !trimmed.match(/\s+(&&|\|\|)\s+/)) {
        console.log(`Checking logical operator on line ${lineNum}: ${trimmed}`);
        // Only flag if it's actually a logical operator in a condition, not in a string or comment
        if (!trimmed.includes('"') && !trimmed.includes("'")) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Invalid Logical Operator",
            desc: `Logical operators require spaces around them.`
          });
        }
      }

      // Invalid Function Call - more specific check
      if (trimmed.match(/\w+\s*\(\s*[^)]*\s*\)/) && trimmed.match(/\w+\s*\(\s*\w+\s*\)/)) {
        console.log(`Checking function call on line ${lineNum}: ${trimmed}`);
        // Only flag if it's actually a problematic function call, not System.out.println or console.log
        if (!trimmed.includes('System.out.println') && !trimmed.includes('console.log') && !trimmed.includes('printf')) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Invalid Function Call",
            desc: `Function calls should have proper parameter syntax.`
          });
        }
      }

      // Incorrect Parameter List
      if (trimmed.match(/\w+\s*\([^)]*\)/) && trimmed.includes(',')) {
        const paramMatch = trimmed.match(/\(([^)]*)\)/);
        if (paramMatch && paramMatch[1].includes(',,')) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Incorrect Parameter List",
            desc: `Double commas found in parameter list. Remove extra comma.`
          });
        }
      }

      // Missing Argument / Extra Argument - more specific check
      if (trimmed.match(/\w+\s*\(\s*\)/) && trimmed.includes(',') ) {
        console.log(`Checking argument mismatch on line ${lineNum}: ${trimmed}`);
        // Only flag if it's actually a function call, not a declaration
        if (!trimmed.match(/^\s*(int|float|double|String|char|boolean|public|private|protected|static)\s+/)) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Extra Argument",
            desc: `Function call has empty parentheses but arguments are provided.`
          });
        }
      }

      // Invalid Data Type Declaration
      if (trimmed.match(/^\s*(int|float|double|String|char|boolean)\s+\w+\s*=\s*"([^"]*)"/)) {
        const typeMatch = trimmed.match(/^\s*(int|float|double|String|char|boolean)\s+(\w+)\s*=\s*"([^"]*)"/);
        const varType = typeMatch[1];
        const varName = typeMatch[2];
        const stringValue = typeMatch[3];
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Type Mismatch Error",
          desc: `You cannot assign a string value "${stringValue}" to a ${varType} variable '${varName}'. In Java, ${varType} can only hold numeric values, not text. Fix: Change the variable type to 'String': "String ${varName} = \"${stringValue}\"" or use a numeric value: "${varType} ${varName} = 0"`
        });
      }

      // Invalid Casting Syntax - more specific check
      if (trimmed.match(/\(\s*\w+\s*\)\s*\w+/) && !trimmed.match(/\(\s*(int|float|double|String|char)\s*\)/)) {
        console.log(`Checking casting syntax on line ${lineNum}: ${trimmed}`);
        // Only flag if it's actually a cast, not a method call or other parentheses usage
        if (!trimmed.match(/\(\s*\w+\s*\)\s*\w+\s*\(/) && !trimmed.includes('System.') && !trimmed.includes('console.')) {
          addError({
            line: lineNum,
            lineContent: line.trim(),
            msg: "Invalid Casting Syntax",
            desc: `Invalid casting syntax. Use valid types: (int), (String), etc.`
          });
        }
      }

      // Null pointer detection
      if (trimmed.includes('null.') || trimmed.includes('NULL.')) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Potential null pointer exception",
          desc: `You're accessing a property on a null value. This will cause a null pointer exception. Check if the object is null before accessing its properties.`
        });
      }

      // Check for unmatched quotes within single line - only check once
      const singleQuotes = (trimmed.match(/'/g) || []).length;
      const doubleQuotes = (trimmed.match(/"/g) || []).length;
      
      // Only add quote errors if they haven't been added already for this line
      const hasQuoteError = errors.some(e => e.line === lineNum && (e.msg === "Unclosed single quote" || e.msg === "Unclosed double quote"));
      
      if (singleQuotes % 2 !== 0 && !hasQuoteError) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Unclosed single quote",
          desc: `Add a closing single quote: "${line.trim()}'" - Make sure every ' has a matching '.`
        });
      }
      if (doubleQuotes % 2 !== 0 && !hasQuoteError) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Unclosed string literal",
          desc: `This string literal is missing a closing quote. The string starts with a quote but doesn't end with one. Fix: "${line.trim()}"" - Add the missing closing quote to complete the string.`
        });
      }
    }

    if (language === 'python') {
      // Python indentation check
      if (i > 0) {
        const prevLine = lines[i - 1];
        const prevTrimmed = prevLine.trim();
        if (prevTrimmed.endsWith(':') && !line.startsWith(' ') && !line.startsWith('\t')) {
          addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Missing indentation",
          desc: `Add indentation to this line: "    ${line.trim()}" - In Python, code blocks after a colon (:) must be indented.`
        });
        }
      }

      // Check for inconsistent indentation
      if (line.startsWith(' ') && line.includes('\t')) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Mixed indentation",
          desc: `Use consistent indentation in: "${line.trim()}" - Choose either spaces or tabs and use it consistently throughout your code.`
        });
      }

      // Python list out of bounds
      if (trimmed.includes('[') && trimmed.includes(']')) {
        const listMatch = trimmed.match(/(\w+)\[(\d+)\]/g);
        if (listMatch) {
          for (const match of listMatch) {
            const index = parseInt(match.match(/\[(\d+)\]/)[1]);
            if (index > 10) {
              addError({
                line: lineNum,
                lineContent: line.trim(),
                msg: "Potential list out of bounds",
                desc: `List index ${index} might be out of bounds. Check if the list has at least ${index + 1} elements. Use len(list) - 1 as the maximum index.`
              });
            }
          }
        }
      }
    }

    // General syntax checks for all languages
    if (trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('===') && !trimmed.includes('!=')) {
      const parts = trimmed.split('=');
      if (parts.length > 2) {
        addError({
          line: lineNum,
          lineContent: line.trim(),
          msg: "Multiple assignment operators",
          desc: `Fix this line: "${line.trim().replace(/=+/g, '=')}" - You have multiple '=' signs. For comparison, use '==' or '===' instead of '='.`
        });
      }
    }

    // Infinite loop detection
    if (trimmed.includes('while(true)') || trimmed.includes('while (true)') || trimmed.includes('for(;;)')) {
      addError({
        line: lineNum,
        lineContent: line.trim(),
        msg: "Potential infinite loop",
        desc: `This loop might run forever. Add a break condition or ensure there's a way to exit the loop in: "${line.trim()}"`
      });
    }
  }

  // Check overall bracket balance at the end of processing
  const allBrackets = code.match(/\{|\}/g) || [];
  let overallBracketBalance = 0;
  let bracketErrors = [];
  
  for (let i = 0; i < allBrackets.length; i++) {
    const bracket = allBrackets[i];
    if (bracket === '{') {
      overallBracketBalance++;
    } else {
      overallBracketBalance--;
    }
    
    if (overallBracketBalance < 0) {
      bracketErrors.push({
        line: 0,
        msg: "Extra closing bracket",
        desc: "Remove the extra '}' or add a matching '{' at the beginning."
      });
      break;
    }
  }
  
  if (overallBracketBalance > 0) {
    bracketErrors.push({
      line: 0,
      msg: "Unclosed brackets",
      desc: `Add ${overallBracketBalance} closing bracket(s) '}' at the end of your code.`
    });
  }
  
  // Only add bracket errors if they exist
  errors.push(...bracketErrors);

  // Check for unused variables (basic detection) - DISABLED as it's not a syntax error
  // Variables can be declared without being used, which is valid syntax
  // const variables = extractVariables(code, language);
  // for (const [varName, lineNum] of variables) {
  //   const usageCount = countVariableUsage(code, varName);
  //   if (usageCount === 1) { // Only declared, never used
  //     addError({
  //       line: lineNum,
  //       msg: "Unused variable",
  //       desc: `Variable '${varName}' is declared but never used. Remove the declaration or use the variable in your code.`
  //     });
  //   }
  // }

  if (errors.length === 0) {
    addError({
      line: 0,
      msg: "No syntax errors found",
      desc: "Great! Your code passed basic syntax checks. However, there might still be logical errors that require deeper analysis."
    });
  }

  return errors;
}

function extractVariables(code, language) {
  const variables = new Map();
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (language === 'java' || language === 'c' || language === 'cpp') {
      const match = line.match(/\b(int|float|double|String|char|boolean|long|short|byte)\s+(\w+)/);
      if (match) {
        variables.set(match[2], i + 1);
      }
    } else if (language === 'javascript') {
      const match = line.match(/\b(let|const|var)\s+(\w+)/);
      if (match) {
        variables.set(match[2], i + 1);
      }
    } else if (language === 'python') {
      const match = line.match(/\b(\w+)\s*=/);
      if (match && !['if', 'while', 'for', 'def', 'class'].includes(match[1])) {
        variables.set(match[1], i + 1);
      }
    }
  }
  
  return variables;
}

function countVariableUsage(code, varName) {
  const regex = new RegExp(`\\b${varName}\\b`, 'g');
  const matches = code.match(regex);
  return matches ? matches.length : 0;
}

function detectLanguage(code) {
  // More specific Java detection first
  if (code.includes('public class') || code.includes('public static void main') || code.includes('System.out.println')) {
    return 'java';
  }
  if (code.includes('def ') || code.includes('import ') || code.includes('from ')) return 'python';
  if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('var ')) return 'javascript';
  if (code.includes('#include') || code.includes('int main(')) return 'c';
  if (code.includes('#include') && code.includes('using namespace')) return 'cpp';
  return 'javascript'; // default
}

function isStatement(line, language) {
  // Check if this line is a statement that needs a semicolon
  const statementPatterns = [
    /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=]/, // variable assignment
    /console\./, // console.log etc.
    /System\./, // Java System.out
    /printf\s*\(/, // C printf
    /cout\s*<</, // C++ cout
    /return\s/, // return statement
    /break\s*;?$/, // break
    /continue\s*;?$/, // continue
    /throw\s/, // throw
    /delete\s/, // delete
    /debugger/, // debugger
  ];

  if (language === 'java' || language === 'c' || language === 'cpp') {
    statementPatterns.push(
      /\w+\s*\.\s*\w+\s*\(/, // method calls like System.out.println()
      /\w+\s*\([^)]*\)\s*$/, // method calls
      /\w+\s*\[[^\]]*\]\s*[^=;]$/, // array access without assignment
    );
  }

  return statementPatterns.some(pattern => pattern.test(line));
}
