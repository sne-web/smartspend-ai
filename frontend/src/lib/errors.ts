import axios from "axios"

/**
 * The HTTP status code from a failed API call, or undefined if the request
 * never got a response at all (network failure, server unreachable, timeout).
 * That distinction is what lets a catch block tell "the server rejected this"
 * apart from "the server couldn't be reached" - two different problems that
 * deserve two different messages.
 */
export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
