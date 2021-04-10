"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveExercise = exports.getFullExercise = void 0;
const axios_1 = __importDefault(require("axios"));
const user_1 = require("./user");
function getFullExercise(exercise_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default({
            url: `api/exercises/${exercise_id}`,
            method: "GET",
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
        return yield response.data;
    });
}
exports.getFullExercise = getFullExercise;
function saveExercise(exercise) {
    return __awaiter(this, void 0, void 0, function* () {
        return axios_1.default({
            url: `api/exercises/${exercise.id}`,
            method: "PATCH",
            data: exercise,
            headers: {
                'Authorization': 'bearer ' + user_1.USERS.getBearerToken()
            }
        });
    });
}
exports.saveExercise = saveExercise;
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
//# sourceMappingURL=exercises.js.map