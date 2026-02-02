import { CommandDefinition } from './types';

class CommandRegistry {
    private commands: Record<string, CommandDefinition> = {};

    register(command: CommandDefinition) {
        this.commands[command.name] = command;
    }

    get(name: string): CommandDefinition | undefined {
        return this.commands[name];
    }

    getAll(): CommandDefinition[] {
        return Object.values(this.commands);
    }

    getRegistry(): Record<string, CommandDefinition> {
        return this.commands;
    }
}

export const registry = new CommandRegistry();
export default registry;
