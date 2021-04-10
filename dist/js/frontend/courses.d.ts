export declare type CourseData = {
    id: number;
    short_name: string;
    full_name: string;
    term: string;
    year: number;
};
export declare function getCourses(): Promise<CourseData[]>;
