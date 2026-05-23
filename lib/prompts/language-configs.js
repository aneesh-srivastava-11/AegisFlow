/**
 * Language-specific configuration for vulnerability detection
 * Maps file extensions to languages and their known dangerous patterns
 */

export const LANGUAGE_CONFIGS = {
  // JavaScript / TypeScript
  '.js': {
    language: 'JavaScript',
    family: 'web',
    dangerousPatterns: [
      'eval(', 'Function(', 'setTimeout(string', 'setInterval(string',
      'innerHTML', 'outerHTML', 'document.write', 'dangerouslySetInnerHTML',
      'exec(', 'execSync(', 'spawn(', 'child_process',
      'require(variable)', 'import(variable)',
      'new Buffer(', 'crypto.createCipher(',
    ],
    secretPatterns: [
      /['"]sk[-_][a-zA-Z0-9]{20,}['"]/,
      /['"]ghp_[a-zA-Z0-9]{36}['"]/,
      /['"]AKIA[A-Z0-9]{16}['"]/,
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
    ],
    packageFile: 'package.json',
    testExtensions: ['.test.js', '.spec.js'],
  },
  '.jsx': {
    language: 'JavaScript (React)',
    family: 'web',
    dangerousPatterns: [
      'dangerouslySetInnerHTML', 'eval(', 'innerHTML',
      'document.write', 'window.location = userInput',
    ],
    secretPatterns: [],
    packageFile: 'package.json',
    testExtensions: ['.test.jsx', '.spec.jsx'],
  },
  '.ts': {
    language: 'TypeScript',
    family: 'web',
    dangerousPatterns: [
      'eval(', 'Function(', 'innerHTML', 'dangerouslySetInnerHTML',
      'exec(', 'execSync(', 'child_process', 'as any',
      '@ts-ignore', 'type assertion to bypass',
    ],
    secretPatterns: [],
    packageFile: 'package.json',
    testExtensions: ['.test.ts', '.spec.ts'],
  },
  '.tsx': {
    language: 'TypeScript (React)',
    family: 'web',
    dangerousPatterns: [
      'dangerouslySetInnerHTML', 'eval(', 'innerHTML', 'as any',
    ],
    secretPatterns: [],
    packageFile: 'package.json',
    testExtensions: ['.test.tsx', '.spec.tsx'],
  },
  '.mjs': {
    language: 'JavaScript (ESM)',
    family: 'web',
    dangerousPatterns: ['eval(', 'Function(', 'import(variable)'],
    secretPatterns: [],
    packageFile: 'package.json',
    testExtensions: [],
  },
  '.cjs': {
    language: 'JavaScript (CJS)',
    family: 'web',
    dangerousPatterns: ['eval(', 'require(variable)', 'exec('],
    secretPatterns: [],
    packageFile: 'package.json',
    testExtensions: [],
  },

  // Python
  '.py': {
    language: 'Python',
    family: 'scripting',
    dangerousPatterns: [
      'eval(', 'exec(', 'compile(', '__import__(',
      'pickle.loads', 'yaml.load(', 'subprocess.call(',
      'os.system(', 'os.popen(', 'commands.getoutput(',
      'input(', 'marshal.loads(', 'shelve.open(',
      'tempfile.mktemp(', 'assert ',
    ],
    secretPatterns: [
      /['"]sk[-_][a-zA-Z0-9]{20,}['"]/,
      /password\s*=\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
    ],
    packageFile: 'requirements.txt',
    testExtensions: ['_test.py', 'test_.py'],
  },

  // Java
  '.java': {
    language: 'Java',
    family: 'jvm',
    dangerousPatterns: [
      'Runtime.getRuntime().exec(', 'ProcessBuilder(',
      'ObjectInputStream(', 'XMLDecoder(',
      'ScriptEngine.eval(', 'Statement.execute(',
      'PreparedStatement without parameterization',
      'Class.forName(', 'Method.invoke(',
      'System.setSecurityManager(null)',
      'java.io.Serializable without serialVersionUID',
    ],
    secretPatterns: [
      /String\s+\w*(password|secret|key|token)\w*\s*=\s*"[^"]+"/i,
    ],
    packageFile: 'pom.xml',
    testExtensions: ['Test.java'],
  },
  '.kt': {
    language: 'Kotlin',
    family: 'jvm',
    dangerousPatterns: [
      'Runtime.getRuntime().exec(', 'ProcessBuilder(',
      'ObjectInputStream(', 'ScriptEngine.eval(',
    ],
    secretPatterns: [],
    packageFile: 'build.gradle.kts',
    testExtensions: ['Test.kt'],
  },

  // Go
  '.go': {
    language: 'Go',
    family: 'systems',
    dangerousPatterns: [
      'exec.Command(', 'os/exec', 'unsafe.Pointer',
      'reflect.', 'cgo', 'C.', 'sql.Query(fmt.Sprintf',
      'http.ListenAndServe(":0"', 'ioutil.ReadAll(',
      'template.HTML(', 'net/http without TLS',
    ],
    secretPatterns: [
      /\w*(password|secret|key|token)\w*\s*[:=]\s*"[^"]+"/i,
    ],
    packageFile: 'go.mod',
    testExtensions: ['_test.go'],
  },

  // Rust
  '.rs': {
    language: 'Rust',
    family: 'systems',
    dangerousPatterns: [
      'unsafe {', 'unsafe fn', 'transmute(', 'from_raw_parts(',
      'ManuallyDrop', 'forget(', 'as_mut_ptr()',
      'std::process::Command', 'libc::', 'extern "C"',
    ],
    secretPatterns: [],
    packageFile: 'Cargo.toml',
    testExtensions: [],
  },

  // PHP
  '.php': {
    language: 'PHP',
    family: 'web',
    dangerousPatterns: [
      'eval(', 'exec(', 'system(', 'passthru(', 'shell_exec(',
      'popen(', 'proc_open(', 'pcntl_exec(',
      'assert(', 'preg_replace with /e', 'create_function(',
      'unserialize(', 'extract(', 'parse_str(',
      'include($', 'require($', '$_GET[', '$_POST[', '$_REQUEST[',
      'mysql_query(', 'mysqli_query($conn, $',
    ],
    secretPatterns: [
      /\$\w*(password|secret|key|token)\w*\s*=\s*['"][^'"]+['"]/i,
    ],
    packageFile: 'composer.json',
    testExtensions: ['Test.php'],
  },

  // Ruby
  '.rb': {
    language: 'Ruby',
    family: 'scripting',
    dangerousPatterns: [
      'eval(', 'exec(', 'system(', 'Kernel.exec', 'Kernel.system',
      'send(', '__send__(', 'public_send(',
      'constantize', 'safe_constantize',
      'Marshal.load(', 'YAML.load(',
      'ERB.new(', 'render inline:',
    ],
    secretPatterns: [
      /\w*(password|secret|key|token)\w*\s*=\s*['"][^'"]+['"]/i,
    ],
    packageFile: 'Gemfile',
    testExtensions: ['_test.rb', '_spec.rb'],
  },

  // C / C++
  '.c': {
    language: 'C',
    family: 'systems',
    dangerousPatterns: [
      'gets(', 'strcpy(', 'strcat(', 'sprintf(', 'scanf(',
      'system(', 'popen(', 'exec(',
      'malloc( without free', 'free( double free',
      'buffer overflow', 'format string',
    ],
    secretPatterns: [],
    packageFile: null,
    testExtensions: [],
  },
  '.cpp': {
    language: 'C++',
    family: 'systems',
    dangerousPatterns: [
      'gets(', 'strcpy(', 'strcat(', 'sprintf(',
      'system(', 'popen(', 'exec(',
      'new without delete', 'delete[]', 'reinterpret_cast',
      'const_cast', 'void*',
    ],
    secretPatterns: [],
    packageFile: null,
    testExtensions: [],
  },
  '.h': { language: 'C/C++ Header', family: 'systems', dangerousPatterns: [], secretPatterns: [], packageFile: null, testExtensions: [] },
  '.hpp': { language: 'C++ Header', family: 'systems', dangerousPatterns: [], secretPatterns: [], packageFile: null, testExtensions: [] },

  // C#
  '.cs': {
    language: 'C#',
    family: 'dotnet',
    dangerousPatterns: [
      'Process.Start(', 'SqlCommand(string concat',
      'BinaryFormatter.Deserialize(', 'Assembly.Load(',
      'Activator.CreateInstance(', 'Type.InvokeMember(',
      'Html.Raw(', 'Response.Write(',
    ],
    secretPatterns: [],
    packageFile: '*.csproj',
    testExtensions: ['Tests.cs'],
  },

  // Swift
  '.swift': {
    language: 'Swift',
    family: 'mobile',
    dangerousPatterns: [
      'UnsafeMutablePointer', 'UnsafeRawPointer',
      'NSTask', 'Process()', 'URLSession without SSL pinning',
    ],
    secretPatterns: [],
    packageFile: 'Package.swift',
    testExtensions: ['Tests.swift'],
  },

  // Scala
  '.scala': {
    language: 'Scala',
    family: 'jvm',
    dangerousPatterns: [
      'Runtime.getRuntime.exec(', 'ProcessBuilder(',
      'sys.process', 'scala.xml.XML.loadString(',
    ],
    secretPatterns: [],
    packageFile: 'build.sbt',
    testExtensions: ['Spec.scala', 'Test.scala'],
  },

  // Shell
  '.sh': {
    language: 'Shell',
    family: 'scripting',
    dangerousPatterns: [
      'eval ', 'exec ', 'curl | sh', 'wget | sh',
      'chmod 777', 'sudo ', 'rm -rf',
      '$( without quotes', '${} without quotes',
    ],
    secretPatterns: [
      /export\s+\w*(PASSWORD|SECRET|KEY|TOKEN)\w*\s*=\s*['"]?[^'"$\s]+/i,
    ],
    packageFile: null,
    testExtensions: [],
  },
  '.bash': {
    language: 'Bash',
    family: 'scripting',
    dangerousPatterns: ['eval ', 'exec ', 'curl | bash', 'chmod 777'],
    secretPatterns: [],
    packageFile: null,
    testExtensions: [],
  },

  // Dart
  '.dart': {
    language: 'Dart',
    family: 'mobile',
    dangerousPatterns: [
      'Process.run(', 'dart:mirrors', 'noSuchMethod',
    ],
    secretPatterns: [],
    packageFile: 'pubspec.yaml',
    testExtensions: ['_test.dart'],
  },

  // SQL
  '.sql': {
    language: 'SQL',
    family: 'database',
    dangerousPatterns: [
      'GRANT ALL', 'DROP TABLE', 'DELETE FROM without WHERE',
      'EXECUTE IMMEDIATE', '-- password',
    ],
    secretPatterns: [
      /password\s*=\s*['"][^'"]+['"]/i,
    ],
    packageFile: null,
    testExtensions: [],
  },

  // Config/Infrastructure
  '.yml': { language: 'YAML', family: 'config', dangerousPatterns: ['!!python', '{{'], secretPatterns: [], packageFile: null, testExtensions: [] },
  '.yaml': { language: 'YAML', family: 'config', dangerousPatterns: ['!!python', '{{'], secretPatterns: [], packageFile: null, testExtensions: [] },
  '.json': { language: 'JSON', family: 'config', dangerousPatterns: [], secretPatterns: [/password|secret|key|token/i], packageFile: null, testExtensions: [] },
  '.toml': { language: 'TOML', family: 'config', dangerousPatterns: [], secretPatterns: [/password|secret|key|token/i], packageFile: null, testExtensions: [] },
  '.xml': { language: 'XML', family: 'config', dangerousPatterns: ['<!ENTITY', 'SYSTEM', 'PUBLIC'], secretPatterns: [], packageFile: null, testExtensions: [] },
  '.tf': { language: 'Terraform', family: 'infra', dangerousPatterns: ['default = "password"', 'sensitive = false'], secretPatterns: [], packageFile: null, testExtensions: [] },
  '.dockerfile': { language: 'Dockerfile', family: 'infra', dangerousPatterns: ['ENV.*PASSWORD', 'ENV.*SECRET', 'ADD http', 'curl.*| sh'], secretPatterns: [], packageFile: null, testExtensions: [] },
};

/**
 * Detect the primary language from a list of files
 * @param {string[]} files - Array of file paths
 * @returns {{ primary: string, all: string[], configs: Object }}
 */
export function detectLanguages(files) {
  const langCount = {};
  const allLangs = new Set();
  const configs = {};

  for (const file of files) {
    const ext = getExtension(file);
    const config = LANGUAGE_CONFIGS[ext];
    if (config) {
      langCount[config.language] = (langCount[config.language] || 0) + 1;
      allLangs.add(config.language);
      configs[config.language] = config;
    }
  }

  const primary = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)[0] || 'Unknown';

  return {
    primary,
    all: Array.from(allLangs),
    configs,
  };
}

/**
 * Get the file extension, handling special cases
 * @param {string} filepath 
 * @returns {string}
 */
function getExtension(filepath) {
  const name = filepath.toLowerCase();
  
  // Special filenames
  if (name.endsWith('dockerfile') || name.includes('dockerfile.')) return '.dockerfile';
  if (name.endsWith('makefile')) return '.sh';
  
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) return '';
  return name.slice(lastDot);
}

/**
 * Get language config for a specific file
 * @param {string} filepath 
 * @returns {Object|null}
 */
export function getLanguageConfig(filepath) {
  const ext = getExtension(filepath);
  return LANGUAGE_CONFIGS[ext] || null;
}
