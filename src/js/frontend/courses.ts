import { USERS } from "./user";

export type CourseData = {
    id: number;
    short_name: string;
    full_name: string;
    term: string;
    year: number;
};

export async function getCourses() {
    const response = await fetch(`public_api/courses`, {
        method: "GET",
        headers: {
            Authorization: "bearer " + USERS.getBearerToken(),
        },
    });

    return (await response.json()) as CourseData[];
}
