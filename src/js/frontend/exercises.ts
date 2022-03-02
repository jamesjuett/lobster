import axios from 'axios';
import { Project } from '../core/Project';
import { Observable } from '../util/observe';
import { assert, Mutable } from '../util/util';
import { icon_middle, ICON_PLUS } from './octicons';
import { ProjectData } from './projects';
import { USERS } from './user';

export type ExerciseData = {
  id: number;
  name: string;
  starter_project_id: number;
  exercise_key: string;
  extra_keys: string[];
};

export async function getFullExercise(exercise_id: number) {
  const response = await axios({
    url: `api/exercises/${exercise_id}`,
    method: 'GET',
    headers: {
      Authorization: 'bearer ' + USERS.getBearerToken(),
    },
  });

  return (await response.data) as ExerciseData;
}

export async function saveExercise(exercise: ExerciseData) {
  return axios({
    url: `api/exercises/${exercise.id}`,
    method: 'PATCH',
    data: exercise,
    headers: {
      Authorization: 'bearer ' + USERS.getBearerToken(),
    },
  });
}

// export class ExerciseOutlet {

//     // public observable = new Observable<ProjectListMessages>(this);

//     private element: JQuery;
//     private createExerciseButton: JQuery;

//     public readonly exercise?: ExerciseData;

//     public constructor(element: JQuery, exercise: ExerciseData) {
//         assert(element.length > 0);
//         this.element = element;

//         this.createExerciseButton =
//             $('<button class="btn btn-primary">Edit Exercise</button>')
//             .appendTo(element)
//             .on("click", () => {
//                 $("#lobster-edit-exercise-modal").modal("show");
//             });

//         this.setUpModals();
//     }

//     private setUpModals() {

//         // Edit Exercise Modal
//         $("#lobster-edit-project-form").on("submit", (e) => {
//             e.preventDefault();
//             this.editActiveProject($("#lobster-edit-project-name").val() as string);
//             $("#lobster-edit-project-modal").modal("hide");
//         });
//         $("#lobster-edit-project-delete").on("click", (e) => {
//             e.preventDefault();
//             this.deleteActiveProject();
//             $("#lobster-edit-project-modal").modal("hide");
//         });
//     }

// }
