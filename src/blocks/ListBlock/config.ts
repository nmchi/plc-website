import { Block } from "payload";

export const ListBlock: Block = {
    slug: 'listBlock',
    interfaceName: 'ListBlock',
    fields: [
        {
            name: 'category',
            type: 'select',
            label: 'Category',
            required: true,
            options: [
                { label: 'CPC2', value: 'cpc2' },
                { label: 'CPC3', value: 'cpc3' },
                { label: 'CPC4', value: 'cpc4' },
                { label: 'CPC5', value: 'cpc5' },
            ],
        },
        {
            name: 'isPublic',
            type: 'checkbox',
            label: 'Ispublic'
        },
    ],
};