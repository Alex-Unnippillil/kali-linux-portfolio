import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const initialTasks = [
  { id: 'task-1', content: 'First Task' },
  { id: 'task-2', content: 'Second Task' },
  { id: 'task-3', content: 'Third Task' },
];

export default function Todoist() {
  const [tasks, setTasks] = useState(initialTasks);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(tasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setTasks(items);
  };

  return (
    <div className="h-full w-full p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tasks">
          {(provided, snapshot) => (
            <ul
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`todoist-task-list ${
                snapshot.isDraggingOver ? 'dragging-over' : ''
              }`}
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`todoist-task ${
                        snapshot.isDragging ? 'dragging' : ''
                      }`}
                    >
                      <span
                        className="todoist-handle"
                        {...provided.dragHandleProps}
                      >
                        ☰
                      </span>
                      {task.content}
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder &&
                React.cloneElement(provided.placeholder, {
                  className: 'todoist-placeholder',
                })}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export const displayTodoist = () => {
  return <Todoist />;
};

