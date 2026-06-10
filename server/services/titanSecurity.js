const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db');

class TitanSecurityScanner {
  async scan() {
    const results = {
      timestamp: new Date().toISOString(),
      critical: [],
      warnings: [],
      info: [],
      fixes: [],
    };

    // 1. Check for default credentials
    const db = getDb();
    try {
      const admin = db.prepare('SELECT * FROM users WHERE role = "admin" LIMIT 1').get();
      if (admin && admin.password === 'admin') {
        results.critical.push('Default admin password detected ("admin"). Change immediately.');
      }
      if (admin && admin.password === 'password') {
        results.critical.push('Weak admin password detected ("password"). Change immediately.');
      }
    } catch (e) {
      results.info.push('Could not check admin credentials: ' + e.message);
    }

    // 2. Check for exposed .env files
    const envPaths = [
      path.join(__dirname, '../../.env'),
      path.join(__dirname, '../../client/.env'),
      path.join(__dirname, '../../client/.env.local'),
      '/var/www/.env',
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const stat = fs.statSync(envPath);
        const mode = stat.mode & parseInt('777', 8);
        if (mode & parseInt('044', 8)) {
          results.warnings.push(`.env file is readable by others: ${envPath}`);
        }
      }
    }

    // 3. Check for exposed sensitive files
    const sensitiveFiles = [
      'server/data.db',
      'server.log',
      '.git',
      'node_modules/.package-lock.json',
    ];
    for (const file of sensitiveFiles) {
      const fullPath = path.join(__dirname, '../..', file);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        const mode = stat.mode & parseInt('777', 8);
        if (mode & parseInt('044', 8)) {
          results.warnings.push(`Sensitive file is readable by others: ${file}`);
        }
      }
    }

    // 4. Check for SQL injection vulnerabilities in code
    const routesDir = path.join(__dirname, '../routes');
    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
      for (const file of routeFiles) {
        const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
        // Check for potential SQL injection patterns
        const dangerousPatterns = [
          /\.prepare\s*\(\s*[`"'].*\$\{.*\}.*[`"']\s*\)/, // Template literals in SQL
          /\.run\s*\(\s*.*\+.*\)/, // String concatenation in .run()
          /\.all\s*\(\s*.*\+.*\)/, // String concatenation in .all()
        ];
        for (const pattern of dangerousPatterns) {
          if (pattern.test(content)) {
            results.warnings.push(`Potential SQL injection in ${file}: ${pattern}`);
          }
        }
      }
    }

    // 5. Check for hardcoded secrets
    const servicesDir = path.join(__dirname, '../services');
    if (fs.existsSync(servicesDir)) {
      const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
      for (const file of serviceFiles) {
        const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*["'][^"']{20,}["']/i,
          /secret\s*[:=]\s*["'][^"']{10,}["']/i,
          /token\s*[:=]\s*["'][^"']{20,}["']/i,
          /password\s*[:=]\s*["'][^"']{6,}["']/i,
        ];
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            results.warnings.push(`Potential hardcoded secret in ${file}: ${pattern}`);
          }
        }
      }
    }

    // 6. Check disk space
    try {
      const df = execSync('df -h / 2>/dev/null | tail -1', { encoding: 'utf8' }).trim();
      const parts = df.split(/\s+/);
      const usagePercent = parseInt(parts[4].replace('%', ''));
      if (usagePercent > 90) {
        results.critical.push(`Disk space critical: ${parts[4]} used. Only ${parts[3]} available.`);
      } else if (usagePercent > 80) {
        results.warnings.push(`Disk space warning: ${parts[4]} used.`);
      }
    } catch (e) {
      results.info.push('Could not check disk space: ' + e.message);
    }

    // 7. Check memory usage
    try {
      const mem = process.memoryUsage();
      const memPercent = (mem.heapUsed / mem.heapTotal) * 100;
      if (memPercent > 90) {
        results.warnings.push(`Memory usage high: ${memPercent.toFixed(1)}% of heap used.`);
      }
    } catch (e) {
      results.info.push('Could not check memory: ' + e.message);
    }

    // 8. Check for open ports
    try {
      const netstat = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null', { encoding: 'utf8' }).trim();
      const exposedPorts = netstat.match(/:\d+\b/g) || [];
      const uniquePorts = [...new Set(exposedPorts)];
      if (uniquePorts.length > 10) {
        results.info.push(`Many open ports detected: ${uniquePorts.length}`);
      }
    } catch (e) {
      results.info.push('Could not check open ports: ' + e.message);
    }

    // 9. Check for unencrypted database
    try {
      const dbPath = path.join(__dirname, '../data.db');
      if (fs.existsSync(dbPath)) {
        const stat = fs.statSync(dbPath);
        const mode = stat.mode & parseInt('777', 8);
        if (mode & parseInt('044', 8)) {
          results.warnings.push('Database file is readable by others. Consider encrypting or restricting permissions.');
        }
      }
    } catch (e) {
      results.info.push('Could not check database permissions: ' + e.message);
    }

    // 10. Check for outdated dependencies
    try {
      const packagePath = path.join(__dirname, '../../package.json');
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const outdated = [];
        for (const [name, version] of Object.entries(deps)) {
          if (version.includes('^') || version.includes('~')) {
            // Loose version, might be outdated
            outdated.push(`${name}@${version}`);
          }
        }
        if (outdated.length > 5) {
          results.warnings.push(`${outdated.length} dependencies use loose version ranges. Consider pinning versions.`);
        }
      }
    } catch (e) {
      results.info.push('Could not check dependencies: ' + e.message);
    }

    // 11. Check for unhandled errors in routes
    const routesDir2 = path.join(__dirname, '../routes');
    if (fs.existsSync(routesDir2)) {
      const routeFiles = fs.readdirSync(routesDir2).filter(f => f.endsWith('.js'));
      for (const file of routeFiles) {
        const content = fs.readFileSync(path.join(routesDir2, file), 'utf8');
        const routeMatches = content.match(/app\.(get|post|put|delete|patch)\s*\(/g) || [];
        const tryCatchBlocks = content.match(/try\s*\{/g) || [];
        if (routeMatches.length > tryCatchBlocks.length * 2) {
          results.warnings.push(`${file}: Many routes without try-catch blocks. Add error handling.`);
        }
      }
    }

    // 12. Check for CORS misconfiguration
    try {
      const indexPath = path.join(__dirname, '../index.js');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        if (content.includes('cors({ origin: "*")') || content.includes('cors()')) {
          results.warnings.push('CORS configured with wildcard origin. Restrict to specific domains.');
        }
      }
    } catch (e) {
      results.info.push('Could not check CORS config: ' + e.message);
    }

    // 13. Generate fix suggestions
    if (results.critical.length > 0) {
      results.fixes.push('Immediately change default/weak passwords.');
      results.fixes.push('Restrict file permissions on .env and database files.');
      results.fixes.push('Add rate limiting to all API endpoints.');
    }
    if (results.warnings.length > 0) {
      results.fixes.push('Review all SQL queries for injection vulnerabilities.');
      results.fixes.push('Move secrets to environment variables.');
      results.fixes.push('Add input validation to all routes.');
    }

    results.score = this.calculateScore(results);
    return results;
  }

  calculateScore(results) {
    let score = 100;
    score -= results.critical.length * 15;
    score -= results.warnings.length * 5;
    score = Math.max(0, Math.min(100, score));
    return score;
  }

  async fixIssue(issueId) {
    // Auto-fix certain issues
    switch (issueId) {
      case 'fix_permissions':
        try {
          execSync('chmod 600 /var/www/iptv-boss/.env /var/www/iptv-boss/server/data.db 2>/dev/null || true');
          return { status: 'fixed', message: 'Restricted permissions on .env and database files.' };
        } catch (e) {
          return { status: 'error', message: e.message };
        }
      case 'fix_cors':
        return { status: 'manual', message: 'Update CORS configuration in server/index.js to restrict origins.' };
      default:
        return { status: 'unknown', message: `Unknown fix: ${issueId}` };
    }
  }
}

const scanner = new TitanSecurityScanner();
module.exports = scanner;
