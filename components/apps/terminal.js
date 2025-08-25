import React, { Component } from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';
import ReactGA from 'react-ga4';

const MAX_HISTORY = 50;

export class Terminal extends Component {
  constructor() {
    super();
    this.child_directories = {
      root: [
        'books',
        'projects',
        'personal-documents',
        'skills',
        'languages',
        'PDPU',
        'interests'
      ],
      PDPU: ['Sem-6'],
      books: [
        'Eric-Jorgenson_The-Almanack-of-Naval-Ravikant.pdf',
        'Elon Musk: How the Billionaire CEO of SpaceX.pdf',
        'The $100 Startup_CHRIS_GUILLEBEAU.pdf',
        'The_Magic_of_Thinking_Big.pdf'
      ],
      skills: [
        'Front-end development',
        'React.js',
        'jQuery',
        'Flutter',
        'Express.js',
        'SQL',
        'Firebase'
      ],
      projects: [
        'alex-unnippillil-portfolio',
        'synonyms-list-react',
        'economist.com-unlocked',
        'Improve-Codeforces',
        'flutter-banking-app',
        'Meditech-Healthcare',
        'CPU-Scheduling-APP-React-Native'
      ],
      interests: ['Software Engineering', 'Deep Learning', 'Cybersecurity'],
      languages: ['Javascript', 'C++', 'Java', 'Dart']
    };
    this.state = {
      history: [],
      prevCommands: [],
      commandIndex: 0,
      currentDirectory: '~',
      currDirName: 'root',
      inputValue: ''
    };
  }

  encode = (str = '') => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  };

  childDirectories = parent => (
    <div className="flex justify-start flex-wrap">
        {this.child_directories[parent].map(file => (
          <span key={file} className="font-bold mr-2 text-ubt-blue">&apos;{file}&apos;</span>
        ))}
    </div>
  );

  handleCommand = command => {
    let words = command.split(' ').filter(Boolean);
    let main = words[0];
    words.shift();
    let rest = words.join(' ').trim();
    let { currentDirectory, currDirName } = this.state;
    let result = null;

    switch (main) {
      case 'cd':
        if (words.length === 0 || rest === '') {
          currentDirectory = '~';
          currDirName = 'root';
        } else if (words.length > 1) {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">too many arguments, arguments must be &lt;1.</pre>
            </div>
          );
        } else if (rest === 'personal-documents') {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`bash /${currDirName} : Permission denied 😏`}</pre>
            </div>
          );
        } else if (this.child_directories[currDirName]?.includes(rest)) {
          currentDirectory += '/' + rest;
          currDirName = rest;
        } else if (rest === '.' || rest === '..' || rest === '../') {
          result = (
            <div className="my-2 font-normal">
                <pre className="whitespace-pre-wrap">Type &apos;cd&apos; to go back 😅</pre>
            </div>
          );
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`bash: cd: ${this.encode(words.join(' '))}: No such file or directory`}</pre>
            </div>
          );
        }
        break;
      case 'ls':
        let target = words[0];
        if (target === '' || target === undefined || target === null) target = currDirName;
        if (words.length > 1) {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">too many arguments, arguments must be &lt;1.</pre>
            </div>
          );
        } else if (target in this.child_directories) {
          result = <div className="my-2 font-normal">{this.childDirectories(target)}</div>;
        } else if (target === 'personal-documents') {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">Nope! 🙃</pre>
            </div>
          );
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`ls: cannot access '${this.encode(words.join(' '))}': No such file or directory`}</pre>
            </div>
          );
        }
        break;
      case 'mkdir':
        if (words[0] !== undefined && words[0] !== '') {
          this.props.addFolder(words[0]);
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">mkdir: missing operand</pre>
            </div>
          );
        }
        break;
      case 'pwd':
        result = (
          <div className="my-2 font-normal">
            <pre className="whitespace-pre-wrap">{currentDirectory.replace('~', '/home/alex')}</pre>
          </div>
        );
        break;
      case 'code':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('vscode');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands:[ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg]`}</pre>
            </div>
          );
        }
        break;
      case 'echo':
        result = (
          <div className="my-2 font-normal">
            <pre className="whitespace-pre-wrap">{this.encode(words.join(' '))}</pre>
          </div>
        );
        break;
      case 'x':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('x');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'spotify':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('spotify');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'chrome':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('chrome');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'todoist':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('todoist');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'trash':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('trash');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'about-alex':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('about-alex');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'terminal':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('terminal');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'settings':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('settings');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'sendmsg':
        if (words[0] === '.' || words.length === 0) {
          this.props.openApp('gedit');
          result = null;
        } else {
          result = (
            <div className="my-2 font-normal">
              <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-, todoist, trash, settings, sendmsg ]`}</pre>
            </div>
          );
        }
        break;
      case 'clear':
        this.setState({ history: [], prevCommands: [], commandIndex: 0, inputValue: '' });
        return null;
      case 'exit':
        document.getElementById('close-terminal')?.click();
        return null;
      case 'sudo':
        ReactGA.event({ category: 'Sudo Access', action: 'lol' });
        result = (
          <div className="my-2 font-normal">
            <img className="w-2/5" src="./images/memes/used-sudo-command.webp" alt="sudo meme" />
          </div>
        );
        break;
      default:
        result = (
          <div className="my-2 font-normal">
            <pre className="whitespace-pre-wrap">{`Command '${this.encode(main)}' not found, or not yet implemented.\nAvailable Commands: [ cd, ls, pwd, echo, clear, exit, mkdir, code, x, spotify, chrome, about-alex, todoist, trash, settings, sendmsg ]`}</pre>
          </div>
        );
    }
    return { result, currentDirectory, currDirName };
  };

  runCommand = command => {
    const promptDir = this.state.currentDirectory;
    const info = this.handleCommand(command);
    if (!info) {
      this.setState(prev => ({
        prevCommands: [...prev.prevCommands, command],
        commandIndex: prev.prevCommands.length + 1,
        inputValue: ''
      }));
      return;
    }
    const sanitizedCommand = this.encode(command);
    this.setState(prev => {
      const prevCommands = [...prev.prevCommands, command];
      let history = [...prev.history, { directory: promptDir, command: sanitizedCommand, output: info.result }];
      if (history.length > MAX_HISTORY) history = history.slice(history.length - MAX_HISTORY);
      return {
        history,
        prevCommands,
        commandIndex: prevCommands.length,
        inputValue: '',
        currentDirectory: info.currentDirectory,
        currDirName: info.currDirName
      };
    });
  };

  checkKey = e => {
    if (e.key === 'Enter') {
      const command = this.state.inputValue.trim();
      if (command.length === 0) return;
      this.runCommand(command);
    } else if (e.key === 'ArrowUp') {
      const newIndex = Math.max(this.state.commandIndex - 1, 0);
      this.setState({
        commandIndex: newIndex,
        inputValue: this.state.prevCommands[newIndex] || ''
      });
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(this.state.commandIndex + 1, this.state.prevCommands.length);
      this.setState({
        commandIndex: newIndex,
        inputValue: this.state.prevCommands[newIndex] || ''
      });
    }
  };

  render() {
    return (
      <div className="h-full w-full bg-ub-cool-grey text-white text-sm font-bold" id="terminal-body">
        {this.state.history.map((item, idx) => (
          <React.Fragment key={idx}>
            <div className="flex w-full h-5">
              <div className="flex">
                <div className="text-ubt-blue">alex@kali</div>
                <div className="text-white mx-px font-medium">:</div>
                <div className="text-ubt-blue">{item.directory}</div>
                <div className="text-white mx-px font-medium mr-1">$</div>
              </div>
              <pre className="flex-1 whitespace-pre-wrap">{item.command}</pre>
            </div>
            {item.output}
          </React.Fragment>
        ))}
        <div className="flex w-full h-5">
          <div className="flex">
            <div className="text-ubt-blue">alex@kali</div>
            <div className="text-white mx-px font-medium">:</div>
            <div className="text-ubt-blue">{this.state.currentDirectory}</div>
            <div className="text-white mx-px font-medium mr-1">$</div>
          </div>
          <input
            value={this.state.inputValue}
            onChange={e => this.setState({ inputValue: e.target.value })}
            onKeyDown={this.checkKey}
            className="flex-1 bg-transparent outline-none"
            spellCheck={false}
            autoFocus
          />
        </div>
      </div>
    );
  }
}

const TerminalWithBoundary = withGameErrorBoundary(Terminal);

export default TerminalWithBoundary;

export const displayTerminal = (addFolder, openApp) => {
  return <TerminalWithBoundary addFolder={addFolder} openApp={openApp}></TerminalWithBoundary>;
};
