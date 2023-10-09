class Task {
    constructor(task, subject, dueDate = '') {
        this.task = task;
        this.subject = subject;
        this.dueDate = dueDate;
    }

    getTask() {
        return this.task;
    }

    setTask(task) {
        this.task = task;
    }

    getSubject() {
        return this.subject;
    }

    setSubject(subject) {
        this.subject = subject;
    }

    getDueDate() {
        return this.dueDate;
    }

    setDueDate(dueDate) {
        this.dueDate = dueDate;
    }

    toString() {
        return `${this.task}, ${this.subject}, ${this.dueDate}`;
    }
}

module.exports = {
    Task,
};