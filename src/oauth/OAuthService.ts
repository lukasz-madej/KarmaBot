import defaultMongoConnector, {MongoConnector} from "../storage/MongoConnector";
import defaultSlackConfig, {SlackConfig} from "../events/SlackConfig";
import {AuthRequest} from "./AuthRequest";
import logger from "../logging/Logger";
import axios, {AxiosInstance} from "axios";
import {TeamAuthToken} from "./TeamAuthToken";

export class OAuthService {
    mongoConnector: MongoConnector = defaultMongoConnector;
    slackConfig: SlackConfig = defaultSlackConfig;
    axios: AxiosInstance = axios.create();

    async authorizeTeam(authRequest: AuthRequest) {
        logger.info("Authenticating with slack.");
        const authResponse = await this.axios.post("https://slack.com/api/oauth.access",
            {
                code: authRequest.code
            },
            {
                auth: {
                    username: this.slackConfig.clientId,
                    password: this.slackConfig.clientSecret
                }
            });

        const token: TeamAuthToken = authResponse.data;
        await this.saveTeamToken(token);
    }

    async saveTeamToken(token: TeamAuthToken) {
        //load old one first to get the id
        logger.info(`Saving token for team ${token.team_id}`);
        const db = await this.mongoConnector.reconnectAndGetDb();
        await db.collection("authtoken").replaceOne({team_id: token.team_id}, token, {upsert: true});
    }

    async getTeamToken(teamId: string) : Promise<TeamAuthToken> {
        logger.info(`Loading token for team ${teamId}`);
        const db = await this.mongoConnector.reconnectAndGetDb();
        const token = await db.collection("authtoken").findOne({team_id: teamId});

        if(token == null) {
            logger.warn(`Couldn't find a token for team ${teamId}`)
        }
        return token;
    }


}

export default new OAuthService();