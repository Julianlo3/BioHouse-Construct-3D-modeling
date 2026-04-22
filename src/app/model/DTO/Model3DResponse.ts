import { MaterialsResponse } from "./MaterialsResponse";
import { UserRequest } from "./UserRequest";

export interface Model3DResponse {
    id: number;
    Title: string;
    description: string;
    materials: MaterialsResponse[];
    owner: UserRequest;
}